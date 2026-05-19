-- ============================================================================
-- Student Authentication System
-- Links Supabase Auth users to enrollment data for secure student access
-- ============================================================================

-- ─── student_accounts table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollment_submissions(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  grade TEXT,
  phone TEXT,
  must_change_password BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(auth_user_id),
  UNIQUE(email)
);

-- ─── RLS Policies ──────────────────────────────────────────────────────────
ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;

-- Students can read their own record
CREATE POLICY "students_read_own" ON public.student_accounts
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Students can update their own record (password flag, profile)
CREATE POLICY "students_update_own" ON public.student_accounts
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Admins can read all student accounts
CREATE POLICY "admins_read_all_students" ON public.student_accounts
  FOR SELECT USING (EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin','editor','coordinator')
  ));

-- Service role can insert (Worker creates accounts via service role key)
CREATE POLICY "service_insert_students" ON public.student_accounts
  FOR INSERT WITH CHECK (true);

-- ─── Add auth_user_id to learner tables ────────────────────────────────────
ALTER TABLE public.learner_course_enrollments
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.learner_progress
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_accounts_auth_user ON public.student_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_student_accounts_email ON public.student_accounts(email);
CREATE INDEX IF NOT EXISTS idx_lce_auth_user ON public.learner_course_enrollments(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_lp_auth_user ON public.learner_progress(auth_user_id);

-- ─── RLS for learner_course_enrollments (auth-based) ───────────────────────
CREATE POLICY "student_auth_read_enrollments" ON public.learner_course_enrollments
  FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "student_auth_insert_enrollments" ON public.learner_course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "student_auth_update_enrollments" ON public.learner_course_enrollments
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- ─── RLS for learner_progress (auth-based) ─────────────────────────────────
CREATE POLICY "student_auth_read_progress" ON public.learner_progress
  FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "student_auth_upsert_progress" ON public.learner_progress
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "student_auth_update_progress" ON public.learner_progress
  FOR UPDATE USING (auth.uid() = auth_user_id);
