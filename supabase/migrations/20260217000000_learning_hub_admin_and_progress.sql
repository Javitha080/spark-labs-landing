-- ═══════════════════════════════════════════════════════════════
-- Learning Hub: enrollment progress trigger + admin RLS
-- ═══════════════════════════════════════════════════════════════

-- 1. Function: update learning_enrollments.progress (0-100) when learning_progress changes
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_course_id UUID;
    v_completed INTEGER := 0;
    v_total INTEGER;
    v_pct INTEGER;
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    v_course_id := COALESCE(NEW.course_id, OLD.course_id);

    SELECT COUNT(*) INTO v_total
    FROM public.learning_modules
    WHERE course_id = v_course_id AND is_published = true;

    IF v_total = 0 THEN
        v_pct := 0;
    ELSE
        SELECT COUNT(DISTINCT lp.module_id) INTO v_completed
        FROM public.learning_progress lp
        JOIN public.learning_modules m ON m.id = lp.module_id AND m.course_id = lp.course_id
        WHERE lp.user_id = v_user_id AND lp.course_id = v_course_id AND lp.is_completed = true;
        v_pct := LEAST(100, (v_completed * 100) / v_total);
    END IF;

    UPDATE public.learning_enrollments
    SET progress = v_pct
    WHERE user_id = v_user_id AND course_id = v_course_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON public.learning_progress;
CREATE TRIGGER trigger_update_enrollment_progress
AFTER INSERT OR UPDATE OR DELETE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION update_enrollment_progress();

-- 2. Admin/editor/coordinator can view all learning_enrollments (for CMS Students / Enrollments list)
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.learning_enrollments;
CREATE POLICY "Admins can view all enrollments"
    ON public.learning_enrollments FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles
            WHERE role IN ('admin', 'editor', 'coordinator')
        )
    );

-- 3. Admin/editor/coordinator can view all learning_reviews (moderation; ensure select all)
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.learning_reviews;
CREATE POLICY "Admins can view all reviews"
    ON public.learning_reviews FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles
            WHERE role IN ('admin', 'editor', 'coordinator')
        )
    );

-- 4. Admin/editor/coordinator can insert/delete enrollments (for CMS Add/Remove enrollment)
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.learning_enrollments;
CREATE POLICY "Admins can insert enrollments"
    ON public.learning_enrollments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles
            WHERE role IN ('admin', 'editor', 'coordinator')
        )
    );

DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.learning_enrollments;
CREATE POLICY "Admins can delete enrollments"
    ON public.learning_enrollments FOR DELETE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles
            WHERE role IN ('admin', 'editor', 'coordinator')
        )
    );
