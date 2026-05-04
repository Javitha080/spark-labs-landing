
-- 1. Remove overly permissive public SELECT on teachers (PII / email exposure)
DROP POLICY IF EXISTS "Public can view teachers via view" ON public.teachers;

-- 2. learning_user_stats: add WITH CHECK to prevent user_id re-attribution
DROP POLICY IF EXISTS "Users can update own stats" ON public.learning_user_stats;
CREATE POLICY "Users can update own stats"
ON public.learning_user_stats
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. learner_progress: add WITH CHECK mirroring USING
DROP POLICY IF EXISTS "Update own progress" ON public.learner_progress;
CREATE POLICY "Update own progress"
ON public.learner_progress
FOR UPDATE
USING (
  (learner_token_id IN (
    SELECT learner_tokens.id FROM learner_tokens
    WHERE learner_tokens.token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text)
  )) OR is_admin_role(auth.uid())
)
WITH CHECK (
  (learner_token_id IN (
    SELECT learner_tokens.id FROM learner_tokens
    WHERE learner_tokens.token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text)
  )) OR is_admin_role(auth.uid())
);

-- 4. learner_course_enrollments: add WITH CHECK mirroring USING
DROP POLICY IF EXISTS "Update own enrollment" ON public.learner_course_enrollments;
CREATE POLICY "Update own enrollment"
ON public.learner_course_enrollments
FOR UPDATE
USING (
  (learner_token_id IN (
    SELECT learner_tokens.id FROM learner_tokens
    WHERE learner_tokens.token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text)
  )) OR is_admin_role(auth.uid())
)
WITH CHECK (
  (learner_token_id IN (
    SELECT learner_tokens.id FROM learner_tokens
    WHERE learner_tokens.token = ((current_setting('request.headers'::text, true))::json ->> 'x-learner-token'::text)
  )) OR is_admin_role(auth.uid())
);
