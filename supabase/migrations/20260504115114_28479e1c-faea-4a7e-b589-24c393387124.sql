-- Ensure new learner/user reviews require moderation before public visibility
ALTER TABLE public.learning_reviews
  ALTER COLUMN is_approved SET DEFAULT false;

-- Prevent authenticated users from creating reviews that are immediately public
DROP POLICY IF EXISTS "Users can create own review" ON public.learning_reviews;
CREATE POLICY "Users can create own review"
  ON public.learning_reviews
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(is_approved, false) = false
  );

-- Prevent learner-token users from creating reviews that are immediately public
DROP POLICY IF EXISTS "Learners can create review via token" ON public.learning_reviews;
CREATE POLICY "Learners can create review via token"
  ON public.learning_reviews
  FOR INSERT
  TO public
  WITH CHECK (
    learner_token_id IS NOT NULL
    AND learner_token_id IN (
      SELECT lt.id
      FROM public.learner_tokens lt
      WHERE lt.token = current_setting('request.headers', true)::json ->> 'x-learner-token'
    )
    AND COALESCE(is_approved, false) = false
  );

-- Allow all recognized admin/content-admin roles to write audit log records
DROP POLICY IF EXISTS "Content admins can insert activity logs" ON public.activity_log;
CREATE POLICY "Admins and content admins can insert activity logs"
  ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_content_admin(auth.uid())
    OR public.is_admin(auth.uid())
    OR public.is_admin_role(auth.uid())
  );