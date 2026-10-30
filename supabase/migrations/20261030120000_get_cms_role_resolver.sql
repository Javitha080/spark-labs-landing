-- Unified CMS role resolver.
--
-- Until now every layer re-implemented role resolution with slightly different
-- semantics: the Worker read ALL user_roles rows and picked a priority-ordered
-- highest role (admin > editor > coordinator > content_creator), the frontend
-- RoleContext used .maybeSingle() and kept an arbitrary row for multi-role
-- users, the admin Edge Functions checked user_roles only (missing
-- users_management), and RLS checked both stores. A user holding several roles
-- across the two stores could have DIFFERENT effective privileges depending on
-- which code path judged them.
--
-- get_cms_role() is now the single source of truth. Consumers:
--   * src/worker/index.ts authMiddleware (replaces 2-3 inline queries with one)
--   * src/contexts/RoleContext.tsx fetchUserRole
--   * supabase/functions/admin-create-user|admin-delete-user|admin-update-user
--
-- SECURITY DEFINER so callers do not need SELECT on
-- user_roles / users_management / roles (those tables are admin-viewed only).
-- The precedence must match the Worker's former ROLE_PRIORITY
-- (admin > editor > coordinator > content_creator). CMS_ACCESS_ROLES in
-- src/lib/rbac.ts is only ever used for membership checks, so its array
-- order carries no meaning; do not copy it here.

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
  ORDER BY p.pri
  LIMIT 1;
$$;

-- The function is called by the browser (RoleContext), the Worker (service
-- role) and Edge Functions (requesting admin JWT) - keep default PUBLIC
-- execute and state it explicitly for clarity.
GRANT EXECUTE ON FUNCTION public.get_cms_role(uuid) TO anon, authenticated, service_role;

-- is_content_admin() / is_admin_role() stay as-is: RLS builds on the cheaper
-- existence checks, while get_cms_role() adds precedence + unknown-name
-- filtering that only the interactive layers need.
