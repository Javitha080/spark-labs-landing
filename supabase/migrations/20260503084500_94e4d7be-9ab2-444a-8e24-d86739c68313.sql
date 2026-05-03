
-- 1. Fix login_attempts INSERT policy: allow authenticated users to insert
DROP POLICY IF EXISTS "Only admins can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Admins can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Authenticated users can insert login attempts" ON public.login_attempts;

CREATE POLICY "Authenticated users can insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow anon to insert (login attempts happen before authentication)
CREATE POLICY "Anon can insert login attempts"
ON public.login_attempts
FOR INSERT
TO anon
WITH CHECK (true);

-- 2. Remove sensitive learner tables from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'learning_enrollments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.learning_enrollments';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'learning_progress'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.learning_progress';
  END IF;
END $$;
