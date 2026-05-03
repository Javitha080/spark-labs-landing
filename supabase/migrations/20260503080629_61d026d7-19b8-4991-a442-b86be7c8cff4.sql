
-- 1. PROFILES: restrict SELECT to owner + admins
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Users can read own profile or admins read all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()) OR public.is_admin_role(auth.uid()));

-- 2. TEAM_MEMBERS: drop public read on raw table (frontend uses team_members_public view)
DROP POLICY IF EXISTS "Anyone can view team members public" ON public.team_members;

-- 3. LEARNING_ACHIEVEMENTS: token-scoped
DROP POLICY IF EXISTS "learner_achievements_anon_insert" ON public.learning_achievements;
DROP POLICY IF EXISTS "learner_achievements_anon_select" ON public.learning_achievements;
DROP POLICY IF EXISTS "public_learner_achievements_insert" ON public.learning_achievements;

CREATE POLICY "achievements_token_select"
  ON public.learning_achievements FOR SELECT
  USING (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

CREATE POLICY "achievements_token_insert"
  ON public.learning_achievements FOR INSERT
  WITH CHECK (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

-- 4. LEARNING_USER_INTERACTIONS: token-scoped
DROP POLICY IF EXISTS "learner_interactions_anon_insert" ON public.learning_user_interactions;
DROP POLICY IF EXISTS "learner_interactions_anon_select" ON public.learning_user_interactions;
DROP POLICY IF EXISTS "public_learner_interactions_insert" ON public.learning_user_interactions;
DROP POLICY IF EXISTS "public_learner_interactions_select" ON public.learning_user_interactions;

CREATE POLICY "interactions_token_select"
  ON public.learning_user_interactions FOR SELECT
  USING (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

CREATE POLICY "interactions_token_insert"
  ON public.learning_user_interactions FOR INSERT
  WITH CHECK (
    learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = (current_setting('request.headers', true)::json ->> 'x-learner-token')
    )
  );

-- 5. STORAGE: lock down gallery & course-content mutating policies
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update course content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete course content" ON storage.objects;

CREATE POLICY "Admins can update gallery"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'gallery' AND public.is_content_admin(auth.uid()));

CREATE POLICY "Admins can delete gallery"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery' AND public.is_content_admin(auth.uid()));

CREATE POLICY "Content admins can update course content"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'course-content' AND public.is_content_admin(auth.uid()));

CREATE POLICY "Content admins can delete course content"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-content' AND public.is_content_admin(auth.uid()));

-- 6. REALTIME: remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.enrollment_submissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.login_attempts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_log;
