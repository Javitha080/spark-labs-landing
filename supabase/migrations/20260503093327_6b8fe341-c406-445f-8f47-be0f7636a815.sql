-- 1. Tighten WITH CHECK on learning_enrollments UPDATE
DROP POLICY IF EXISTS "Users can update their own progress" ON public.learning_enrollments;
CREATE POLICY "Users can update their own progress"
  ON public.learning_enrollments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Prevent content creators from self-publishing blog posts
DROP POLICY IF EXISTS "Authors can update own posts" ON public.blog_posts;
CREATE POLICY "Authors can update own posts"
  ON public.blog_posts FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND status <> 'published'::blog_post_status
  );

-- 3. Prevent learners/users from self-approving their own reviews
DROP POLICY IF EXISTS "Learners can update own token review" ON public.learning_reviews;
CREATE POLICY "Learners can update own token review"
  ON public.learning_reviews FOR UPDATE
  USING (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = current_setting('request.headers', true)::json->>'x-learner-token'
    )
  )
  WITH CHECK (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = current_setting('request.headers', true)::json->>'x-learner-token'
    )
    AND is_approved = false
  );

DROP POLICY IF EXISTS "Users can update own review" ON public.learning_reviews;
CREATE POLICY "Users can update own review"
  ON public.learning_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_approved = false);

-- 4. Add token-scoped DELETE policy on learning_user_stats
DROP POLICY IF EXISTS "Learners can delete own token stats" ON public.learning_user_stats;
CREATE POLICY "Learners can delete own token stats"
  ON public.learning_user_stats FOR DELETE
  USING (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT id FROM public.learner_tokens
      WHERE token = current_setting('request.headers', true)::json->>'x-learner-token'
    )
  );

-- 5. Public access to teachers via security_invoker view: allow public SELECT on base
--    (teachers_public view masks the email column).
DROP POLICY IF EXISTS "Public can view basic team info" ON public.team_members;
DROP POLICY IF EXISTS "Public can view teachers via view" ON public.teachers;
CREATE POLICY "Public can view teachers via view"
  ON public.teachers FOR SELECT
  USING (true);