-- ═══════════════════════════════════════════════════════════════════════════
-- Close three public exposure holes found in the 2026-10-31 skills audit.
--
--   1. learning_certificates_public was an owner-rights view granted to anon,
--      so anyone holding the publishable key could list every student name,
--      course and certificate code in the cohort. Verification only needs a
--      lookup by code, so the view is replaced with verify_certificate(text).
--
--   2. get_cms_role(uuid) is SECURITY DEFINER and was granted to anon without
--      a caller check, letting anonymous callers read any user's CMS role.
--      It now resolves the caller's own role only (plus service_role).
--
--   3. 20260504140000 re-opened anon SELECT on the raw team_members/teachers
--      tables, defeating the *_public views that mask email behind
--      show_email. The base tables are closed again and the views are
--      restored as owner-rights projections.
--
-- Owner-rights views are deliberate: column masking (CASE WHEN show_email)
-- cannot be expressed with RLS, and security_invoker would require granting
-- anon SELECT on the base row - exactly the leak being closed. The
-- projections are explicit, so the Supabase "security definer view" advisor
-- warning is expected here and is documented, not accidental.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Certificate verification: one row by code, never a listable view ────

DROP VIEW IF EXISTS public.learning_certificates_public;

CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
RETURNS TABLE (
    certificate_code text,
    student_name text,
    course_title text,
    course_slug text,
    issued_at timestamptz,
    revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT c.certificate_code,
           p.full_name,
           k.title,
           k.slug,
           c.issued_at,
           c.revoked_at
    FROM public.learning_certificates c
    JOIN public.profiles p ON p.id = c.user_id
    JOIN public.learning_courses k ON k.id = c.course_id
    WHERE btrim(p_code) <> ''
      AND c.certificate_code = btrim(p_code)
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text)
    TO anon, authenticated, service_role;

-- ─── 2. get_cms_role: only the caller's own role (or the service role) ──────

CREATE OR REPLACE FUNCTION public.get_cms_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    -- Legacy store: one row per (user_id, role), a user may hold several.
    SELECT ur.role::text AS name
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
    UNION ALL
    -- Extended store: single role_id via users_management.
    SELECT r.name
    FROM public.users_management um
    JOIN public.roles r ON r.id = um.role_id
    WHERE um.user_id = p_user_id
  )
  SELECT c.name
  FROM candidates c
  -- Unknown/custom role names (created by RolesManager) are NOT CMS roles -
  -- only the four canonical names resolve, everything else yields NULL, which
  -- callers must treat as "no CMS access" (same as the old pickHighestRole()).
  JOIN (VALUES ('admin', 1), ('editor', 2), ('coordinator', 3), ('content_creator', 4))
    AS p(name, pri) ON p.name = c.name
  -- Caller guard: a signed-in user may only resolve their own role. The
  -- Worker and Edge Functions call this with the service role key, where
  -- auth.uid() is NULL and auth.role() is 'service_role'.
  WHERE p_user_id = auth.uid() OR auth.role() = 'service_role'
  ORDER BY p.pri
  LIMIT 1;
$$;

-- Function EXECUTE defaults to PUBLIC: revoke that first, then grant the two
-- roles that legitimately call it.
REVOKE ALL ON FUNCTION public.get_cms_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cms_role(uuid) TO authenticated, service_role;

-- ─── 3. team_members: close the base table, keep the masked public views ────

DROP POLICY IF EXISTS "Allow anonymous read access" ON public.team_members;
REVOKE SELECT ON public.team_members FROM anon;

-- Base-table read is now CMS staff only. The pre-existing policy uses
-- is_admin(), which (a) checks only user_roles, so admins provisioned through
-- users_management could not read their own CMS data, and (b) excludes the
-- editor role even though /admin/team, /admin/teachers and /admin/leadership
-- are granted to editors via PAGE_PERMISSION_MAP. is_content_admin() covers
-- both role stores and exactly the four CMS roles.
DROP POLICY IF EXISTS "CMS roles can read team members" ON public.team_members;
CREATE POLICY "CMS roles can read team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP VIEW IF EXISTS public.team_members_public;
CREATE VIEW public.team_members_public
WITH (security_invoker = false)
AS
SELECT
  id,
  name,
  role,
  description,
  image_url,
  CASE WHEN show_email = true THEN email ELSE NULL END AS email,
  linkedin_url,
  display_order,
  is_leadership,
  tagline,
  department,
  github_url,
  twitter_url,
  website_url,
  tenure_start,
  tenure_end
FROM public.team_members
ORDER BY display_order ASC;

GRANT SELECT ON public.team_members_public TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.leadership_members_public;
CREATE VIEW public.leadership_members_public
WITH (security_invoker = false)
AS
SELECT
  id,
  name,
  role,
  description,
  image_url,
  CASE WHEN show_email = true THEN email ELSE NULL END AS email,
  linkedin_url,
  display_order,
  tagline,
  department,
  github_url,
  twitter_url,
  website_url,
  tenure_start,
  tenure_end
FROM public.team_members
WHERE is_leadership = true
ORDER BY display_order ASC;

GRANT SELECT ON public.leadership_members_public TO anon, authenticated, service_role;

-- ─── 4. teachers: same treatment (email stays behind the view) ──────────────

DROP POLICY IF EXISTS "Allow anonymous read access" ON public.teachers;
DROP POLICY IF EXISTS "Public can view teachers via view" ON public.teachers;
REVOKE SELECT ON public.teachers FROM anon;

DROP VIEW IF EXISTS public.teachers_public;
CREATE VIEW public.teachers_public
WITH (security_invoker = false) AS
SELECT id, name, role, bio, image_url, display_order, created_at
FROM public.teachers
ORDER BY display_order ASC;

GRANT SELECT ON public.teachers_public TO anon, authenticated, service_role;
