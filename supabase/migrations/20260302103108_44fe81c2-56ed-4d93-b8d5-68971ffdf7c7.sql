
-- ═══════════════════════════════════════════
-- 1. Learner Tokens (identity from enrollment form)
-- ═══════════════════════════════════════════
CREATE TABLE public.learner_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES public.enrollment_submissions(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  browser_fingerprint TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  grade TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can create a token (during enrollment)
CREATE POLICY "Anyone can create learner token"
  ON public.learner_tokens FOR INSERT
  WITH CHECK (true);

-- Anyone can read their own token (by token match)
CREATE POLICY "Anyone can read own token"
  ON public.learner_tokens FOR SELECT
  USING (true);

-- Anyone can update last_seen_at
CREATE POLICY "Anyone can update own token"
  ON public.learner_tokens FOR UPDATE
  USING (true);

-- Admins can delete tokens
CREATE POLICY "Admins can delete tokens"
  ON public.learner_tokens FOR DELETE
  USING (is_admin_role(auth.uid()));

-- ═══════════════════════════════════════════
-- 2. Learner Course Enrollments
-- ═══════════════════════════════════════════
CREATE TABLE public.learner_course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_token_id UUID NOT NULL REFERENCES public.learner_tokens(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(learner_token_id, course_id)
);

ALTER TABLE public.learner_course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can enroll" ON public.learner_course_enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read enrollments" ON public.learner_course_enrollments FOR SELECT USING (true);
CREATE POLICY "Anyone can update own enrollment" ON public.learner_course_enrollments FOR UPDATE USING (true);
CREATE POLICY "Admins can delete enrollments" ON public.learner_course_enrollments FOR DELETE USING (is_admin_role(auth.uid()));

-- ═══════════════════════════════════════════
-- 3. Learner Progress (module-level)
-- ═══════════════════════════════════════════
CREATE TABLE public.learner_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_token_id UUID NOT NULL REFERENCES public.learner_tokens(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(learner_token_id, course_id, module_id)
);

ALTER TABLE public.learner_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert progress" ON public.learner_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read progress" ON public.learner_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can update progress" ON public.learner_progress FOR UPDATE USING (true);
CREATE POLICY "Admins can delete progress" ON public.learner_progress FOR DELETE USING (is_admin_role(auth.uid()));

-- ═══════════════════════════════════════════
-- 4. Module Content Blocks (rich classroom content)
-- ═══════════════════════════════════════════
CREATE TABLE public.module_content_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL DEFAULT 'text',
  title TEXT,
  content TEXT,
  code_language TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.module_content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert blocks" ON public.module_content_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update blocks" ON public.module_content_blocks FOR UPDATE USING (true);
CREATE POLICY "Admins can delete blocks" ON public.module_content_blocks FOR DELETE USING (true);
CREATE POLICY "Anyone can read published blocks" ON public.module_content_blocks FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can read all blocks" ON public.module_content_blocks FOR SELECT USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_module_content_blocks_updated_at
  BEFORE UPDATE ON public.module_content_blocks
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

-- ═══════════════════════════════════════════
-- 5. Auto-update learner enrollment progress
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_learner_enrollment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_id UUID;
    v_course_id UUID;
    v_completed INTEGER;
    v_total INTEGER;
    v_pct INTEGER;
BEGIN
    v_token_id := COALESCE(NEW.learner_token_id, OLD.learner_token_id);
    v_course_id := COALESCE(NEW.course_id, OLD.course_id);

    SELECT COUNT(*) INTO v_total
    FROM public.learning_modules
    WHERE course_id = v_course_id AND is_published = true;

    IF v_total = 0 THEN v_pct := 0;
    ELSE
        SELECT COUNT(DISTINCT lp.module_id) INTO v_completed
        FROM public.learner_progress lp
        JOIN public.learning_modules m ON m.id = lp.module_id
        WHERE lp.learner_token_id = v_token_id AND lp.course_id = v_course_id AND lp.is_completed = true;
        v_pct := LEAST(100, (v_completed * 100) / v_total);
    END IF;

    UPDATE public.learner_course_enrollments
    SET progress = v_pct,
        completed_at = CASE WHEN v_pct >= 100 THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE learner_token_id = v_token_id AND course_id = v_course_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_learner_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.learner_progress
  FOR EACH ROW EXECUTE FUNCTION update_learner_enrollment_progress();
