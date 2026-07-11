
DROP POLICY IF EXISTS "service_insert_students" ON public.student_accounts;
DROP POLICY IF EXISTS "students_insert_own" ON public.student_accounts;
CREATE POLICY "students_insert_own" ON public.student_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

ALTER TABLE public.cached_json ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cached_json FROM anon;
REVOKE ALL ON public.cached_json FROM authenticated;
GRANT ALL ON public.cached_json TO service_role;
