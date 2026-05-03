-- 1. Remove sensitive learner tables from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'learner_course_enrollments'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.learner_course_enrollments;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'learner_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.learner_progress;
  END IF;
END $$;

-- 2. Lock down login_attempts INSERT - remove broad authenticated insert
DROP POLICY IF EXISTS "Authenticated can log attempts" ON public.login_attempts;

-- Only admins (or SECURITY DEFINER functions which bypass RLS) may insert
CREATE POLICY "Only admins can insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 3. Explicit deny policies for enrollment_rate_limits direct writes
-- (SECURITY DEFINER function check_enrollment_rate_limit still works as it bypasses RLS)
CREATE POLICY "Deny direct inserts on rate limits"
ON public.enrollment_rate_limits
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Deny direct updates on rate limits"
ON public.enrollment_rate_limits
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny direct deletes on rate limits"
ON public.enrollment_rate_limits
FOR DELETE
TO public
USING (false);