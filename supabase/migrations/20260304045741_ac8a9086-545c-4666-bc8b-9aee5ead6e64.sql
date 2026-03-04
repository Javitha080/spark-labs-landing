
-- ============================================================
-- 1. CREATE ALL MISSING TRIGGERS
-- ============================================================

-- Trigger: auto-update learning_enrollments.progress when learning_progress changes
CREATE TRIGGER trg_update_enrollment_progress
AFTER INSERT OR UPDATE OR DELETE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_progress();

-- Trigger: auto-update learner_course_enrollments.progress when learner_progress changes
CREATE TRIGGER trg_update_learner_enrollment_progress
AFTER INSERT OR UPDATE OR DELETE ON public.learner_progress
FOR EACH ROW EXECUTE FUNCTION public.update_learner_enrollment_progress();

-- Trigger: auto-update learning_courses rating when reviews change
CREATE TRIGGER trg_update_course_rating
AFTER INSERT OR UPDATE OR DELETE ON public.learning_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_course_rating();

-- Trigger: auto-update learning_courses enrolled_count when enrollments change
CREATE TRIGGER trg_update_enrolled_count
AFTER INSERT OR UPDATE OR DELETE ON public.learning_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_enrolled_count();

-- Trigger: auto-update updated_at on learning_courses
CREATE TRIGGER trg_learning_courses_updated_at
BEFORE UPDATE ON public.learning_courses
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- Trigger: auto-update updated_at on learning_sections
CREATE TRIGGER trg_learning_sections_updated_at
BEFORE UPDATE ON public.learning_sections
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- Trigger: auto-update updated_at on learning_modules
CREATE TRIGGER trg_learning_modules_updated_at
BEFORE UPDATE ON public.learning_modules
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- Trigger: auto-update updated_at on learning_workshops
CREATE TRIGGER trg_learning_workshops_updated_at
BEFORE UPDATE ON public.learning_workshops
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- Trigger: auto-update updated_at on learning_resources
CREATE TRIGGER trg_learning_resources_updated_at
BEFORE UPDATE ON public.learning_resources
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- Trigger: auto-update updated_at on learning_reviews
CREATE TRIGGER trg_learning_reviews_updated_at
BEFORE UPDATE ON public.learning_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- Trigger: auto-update updated_at on module_content_blocks
CREATE TRIGGER trg_module_content_blocks_updated_at
BEFORE UPDATE ON public.module_content_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_learning_updated_at();

-- Trigger: auto-calculate reading time on blog_posts
CREATE TRIGGER trg_calculate_reading_time
BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.calculate_reading_time();

-- Trigger: validate enrollment submissions
CREATE TRIGGER trg_validate_enrollment_submission
BEFORE INSERT ON public.enrollment_submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_enrollment_submission();

-- ============================================================
-- 2. FIX SEARCH_PATH ON FUNCTIONS
-- ============================================================

ALTER FUNCTION public.update_course_rating() SET search_path = public;
ALTER FUNCTION public.update_enrolled_count() SET search_path = public;
ALTER FUNCTION public.update_enrollment_progress() SET search_path = public;
ALTER FUNCTION public.update_learner_enrollment_progress() SET search_path = public;
ALTER FUNCTION public.update_learning_updated_at() SET search_path = public;

-- ============================================================
-- 3. ADD UNIQUE CONSTRAINT ON learning_reviews FOR UPSERT
-- ============================================================

-- Allow upsert by (user_id, course_id) for authenticated users
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_reviews_user_course
ON public.learning_reviews (user_id, course_id)
WHERE user_id IS NOT NULL;

-- ============================================================
-- 4. TIGHTEN RLS ON ADMIN-ONLY TABLES
-- Replace USING(true) / WITH CHECK(true) with admin role checks
-- ============================================================

-- learning_courses: write operations
DROP POLICY IF EXISTS "Admins can insert courses" ON public.learning_courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.learning_courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.learning_courses;

CREATE POLICY "Admins can insert courses" ON public.learning_courses
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can update courses" ON public.learning_courses
FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can delete courses" ON public.learning_courses
FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor'))
);

-- learning_sections: write operations
DROP POLICY IF EXISTS "Admins can insert sections" ON public.learning_sections;
DROP POLICY IF EXISTS "Admins can update sections" ON public.learning_sections;
DROP POLICY IF EXISTS "Admins can delete sections" ON public.learning_sections;

CREATE POLICY "Admins can insert sections" ON public.learning_sections
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can update sections" ON public.learning_sections
FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can delete sections" ON public.learning_sections
FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor'))
);

-- learning_workshops: write operations
DROP POLICY IF EXISTS "Admins can insert workshops" ON public.learning_workshops;
DROP POLICY IF EXISTS "Admins can update workshops" ON public.learning_workshops;
DROP POLICY IF EXISTS "Admins can delete workshops" ON public.learning_workshops;

CREATE POLICY "Admins can insert workshops" ON public.learning_workshops
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor'))
);
CREATE POLICY "Admins can update workshops" ON public.learning_workshops
FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor'))
);
CREATE POLICY "Admins can delete workshops" ON public.learning_workshops
FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor'))
);

-- learning_resources: write operations
DROP POLICY IF EXISTS "Admins can insert resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Admins can update resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.learning_resources;

CREATE POLICY "Admins can insert resources" ON public.learning_resources
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can update resources" ON public.learning_resources
FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can delete resources" ON public.learning_resources
FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor'))
);

-- module_content_blocks: write operations
DROP POLICY IF EXISTS "Admins can insert blocks" ON public.module_content_blocks;
DROP POLICY IF EXISTS "Admins can update blocks" ON public.module_content_blocks;
DROP POLICY IF EXISTS "Admins can delete blocks" ON public.module_content_blocks;

CREATE POLICY "Admins can insert blocks" ON public.module_content_blocks
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can update blocks" ON public.module_content_blocks
FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor', 'content_creator'))
);
CREATE POLICY "Admins can delete blocks" ON public.module_content_blocks
FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'editor'))
);
