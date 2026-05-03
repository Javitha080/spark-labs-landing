
-- 1. learner_progress: tighten policies
DROP POLICY IF EXISTS "Anyone can read progress" ON public.learner_progress;
DROP POLICY IF EXISTS "Anyone can insert progress" ON public.learner_progress;

CREATE POLICY "Read own progress or admin"
  ON public.learner_progress FOR SELECT
  USING (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
    OR public.is_admin_role(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Insert own progress"
  ON public.learner_progress FOR INSERT
  WITH CHECK (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

-- 2. learner_course_enrollments: tighten policies
DROP POLICY IF EXISTS "Anyone can read enrollments" ON public.learner_course_enrollments;
DROP POLICY IF EXISTS "Anyone can enroll" ON public.learner_course_enrollments;

CREATE POLICY "Read own enrollments or admin"
  ON public.learner_course_enrollments FOR SELECT
  USING (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
    OR public.is_admin_role(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Enroll own token"
  ON public.learner_course_enrollments FOR INSERT
  WITH CHECK (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

-- 3. learning_reviews: fix token-based update ownership
DROP POLICY IF EXISTS "Learners can update own token review" ON public.learning_reviews;

CREATE POLICY "Learners can update own token review"
  ON public.learning_reviews FOR UPDATE
  USING (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

-- Also tighten learner review insert to require matching token
DROP POLICY IF EXISTS "Learners can create review via token" ON public.learning_reviews;
CREATE POLICY "Learners can create review via token"
  ON public.learning_reviews FOR INSERT
  WITH CHECK (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

-- 4. learning_user_stats: tighten anon update/insert/select to token owner
DROP POLICY IF EXISTS "learner_stats_anon_update" ON public.learning_user_stats;
DROP POLICY IF EXISTS "learner_stats_anon_insert" ON public.learning_user_stats;
DROP POLICY IF EXISTS "learner_stats_anon_select" ON public.learning_user_stats;

CREATE POLICY "learner_stats_token_select"
  ON public.learning_user_stats FOR SELECT
  USING (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

CREATE POLICY "learner_stats_token_insert"
  ON public.learning_user_stats FOR INSERT
  WITH CHECK (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

CREATE POLICY "learner_stats_token_update"
  ON public.learning_user_stats FOR UPDATE
  USING (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  )
  WITH CHECK (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

-- 5. Realtime: restrict subscriptions to authenticated users only
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);
