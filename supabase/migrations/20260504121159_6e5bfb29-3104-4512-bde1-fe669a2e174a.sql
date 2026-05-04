
-- learner_tokens: prevent reassignment of immutable/sensitive fields
DROP POLICY IF EXISTS "Update own learner token" ON public.learner_tokens;
CREATE POLICY "Update own learner token"
ON public.learner_tokens
FOR UPDATE
USING (
  (token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
  OR is_admin_role(auth.uid())
)
WITH CHECK (
  is_admin_role(auth.uid())
  OR (
    token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text)
    AND id = (SELECT id FROM public.learner_tokens lt WHERE lt.token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
    AND enrollment_id IS NOT DISTINCT FROM (SELECT enrollment_id FROM public.learner_tokens lt WHERE lt.token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
    AND email = (SELECT email FROM public.learner_tokens lt WHERE lt.token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
  )
);

-- learner_course_enrollments: lock learner_token_id and course_id during update
DROP POLICY IF EXISTS "Update own enrollment" ON public.learner_course_enrollments;
CREATE POLICY "Update own enrollment"
ON public.learner_course_enrollments
FOR UPDATE
USING (
  (learner_token_id IN (SELECT id FROM public.learner_tokens WHERE token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text)))
  OR is_admin_role(auth.uid())
)
WITH CHECK (
  is_admin_role(auth.uid())
  OR (
    learner_token_id IN (SELECT id FROM public.learner_tokens WHERE token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
    AND learner_token_id = (SELECT lce.learner_token_id FROM public.learner_course_enrollments lce WHERE lce.id = learner_course_enrollments.id)
    AND course_id = (SELECT lce.course_id FROM public.learner_course_enrollments lce WHERE lce.id = learner_course_enrollments.id)
  )
);

-- learner_progress: lock learner_token_id, course_id, module_id during update
DROP POLICY IF EXISTS "Update own progress" ON public.learner_progress;
CREATE POLICY "Update own progress"
ON public.learner_progress
FOR UPDATE
USING (
  (learner_token_id IN (SELECT id FROM public.learner_tokens WHERE token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text)))
  OR is_admin_role(auth.uid())
)
WITH CHECK (
  is_admin_role(auth.uid())
  OR (
    learner_token_id IN (SELECT id FROM public.learner_tokens WHERE token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
    AND learner_token_id = (SELECT lp.learner_token_id FROM public.learner_progress lp WHERE lp.id = learner_progress.id)
    AND course_id = (SELECT lp.course_id FROM public.learner_progress lp WHERE lp.id = learner_progress.id)
    AND module_id = (SELECT lp.module_id FROM public.learner_progress lp WHERE lp.id = learner_progress.id)
  )
);

-- learning_user_stats: token-based insert must not impersonate an authenticated user_id
DROP POLICY IF EXISTS "learner_stats_token_insert" ON public.learning_user_stats;
CREATE POLICY "learner_stats_token_insert"
ON public.learning_user_stats
FOR INSERT
WITH CHECK (
  learner_token_id IS NOT NULL
  AND user_id IS NULL
  AND learner_token_id IN (SELECT id FROM public.learner_tokens WHERE token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
);

-- Also harden token-based update on stats to prevent setting user_id
DROP POLICY IF EXISTS "learner_stats_token_update" ON public.learning_user_stats;
CREATE POLICY "learner_stats_token_update"
ON public.learning_user_stats
FOR UPDATE
USING (
  learner_token_id IS NOT NULL
  AND learner_token_id IN (SELECT id FROM public.learner_tokens WHERE token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
)
WITH CHECK (
  learner_token_id IS NOT NULL
  AND user_id IS NULL
  AND learner_token_id IN (SELECT id FROM public.learner_tokens WHERE token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text))
);
