
-- 1) Recreate team_members_public as SECURITY INVOKER (safe)
DROP VIEW IF EXISTS public.team_members_public;
CREATE VIEW public.team_members_public
WITH (security_invoker = true) AS
SELECT id, name, role, description, image_url,
       CASE WHEN show_email = true THEN email ELSE NULL::text END AS email,
       linkedin_url, display_order, created_at
FROM public.team_members
ORDER BY display_order, created_at;

GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- 2) Tighten learner_* policies (replace USING (true) UPDATE/DELETE permissive policies)
-- learner_tokens: SELECT only by matching token, UPDATE only by matching token
DROP POLICY IF EXISTS "Anyone can read own token" ON public.learner_tokens;
DROP POLICY IF EXISTS "Anyone can update own token" ON public.learner_tokens;

CREATE POLICY "Read own learner token"
ON public.learner_tokens FOR SELECT TO public
USING (
  token = current_setting('request.headers', true)::json->>'x-learner-token'
  OR is_admin_role(auth.uid())
  OR is_admin(auth.uid())
);

CREATE POLICY "Update own learner token"
ON public.learner_tokens FOR UPDATE TO public
USING (
  token = current_setting('request.headers', true)::json->>'x-learner-token'
  OR is_admin_role(auth.uid())
);

-- learner_course_enrollments: tighten UPDATE
DROP POLICY IF EXISTS "Anyone can update own enrollment" ON public.learner_course_enrollments;
CREATE POLICY "Update own enrollment"
ON public.learner_course_enrollments FOR UPDATE TO public
USING (
  learner_token_id IN (
    SELECT id FROM public.learner_tokens
    WHERE token = current_setting('request.headers', true)::json->>'x-learner-token'
  )
  OR is_admin_role(auth.uid())
);

-- learner_progress: tighten UPDATE
DROP POLICY IF EXISTS "Anyone can update progress" ON public.learner_progress;
CREATE POLICY "Update own progress"
ON public.learner_progress FOR UPDATE TO public
USING (
  learner_token_id IN (
    SELECT id FROM public.learner_tokens
    WHERE token = current_setting('request.headers', true)::json->>'x-learner-token'
  )
  OR is_admin_role(auth.uid())
);
