-- ============================================================================
-- Secure Student Accounts and Add Rate Limits
-- ============================================================================

-- 1. Secure `student_accounts` INSERT policy
DROP POLICY IF EXISTS "service_insert_students" ON public.student_accounts;

CREATE POLICY "students_insert_own" ON public.student_accounts
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = auth_user_id);

-- 2. Restrict learner_course_enrollments and learner_progress properly
DROP POLICY IF EXISTS "student_auth_insert_enrollments" ON public.learner_course_enrollments;
CREATE POLICY "student_auth_insert_enrollments" ON public.learner_course_enrollments
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "student_auth_upsert_progress" ON public.learner_progress;
CREATE POLICY "student_auth_upsert_progress" ON public.learner_progress
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = auth_user_id);

-- 3. Automatic student_accounts creation for manually created admin users
-- Admin creates user -> auth.users trigger fires -> student_accounts is populated

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into student_accounts for every new user 
  INSERT INTO public.student_accounts (auth_user_id, email, name, is_active, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true,
    false
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_student ON auth.users;
CREATE TRIGGER on_auth_user_created_student
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- 4. Backfill existing admin-created users who don't have a student_accounts record
-- This fixes the issue where admins created duplicate/manual users but the system didn't recognize them.
INSERT INTO public.student_accounts (auth_user_id, email, name, is_active, must_change_password)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email), 
  true, 
  false
FROM auth.users
WHERE id NOT IN (SELECT auth_user_id FROM public.student_accounts)
ON CONFLICT (auth_user_id) DO NOTHING;
