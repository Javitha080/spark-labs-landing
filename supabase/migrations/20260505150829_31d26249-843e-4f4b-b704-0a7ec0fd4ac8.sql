-- analytics_events: restrict insert
DROP POLICY IF EXISTS "Anyone can track analytics" ON public.analytics_events;
CREATE POLICY "Users can track own analytics"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- login_attempts: explicit deny insert from clients (only SECURITY DEFINER RPC writes)
DROP POLICY IF EXISTS "Deny direct insert on login_attempts" ON public.login_attempts;
CREATE POLICY "Deny direct insert on login_attempts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

-- learning_reviews: remove from realtime publication to avoid broadcasting user_id
ALTER PUBLICATION supabase_realtime DROP TABLE public.learning_reviews;