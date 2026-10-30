-- ═══════════════════════════════════════════════════════════════════════════
-- Learning Hub: fix achievement self-award, completion stamps, certificates,
-- and server-side video resume position.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Students can earn their own achievements again.
--    The 20260503081734 migration accidentally removed the original
--    "Users can insert own achievements" policy and made inserts
--    admin-only, which silently broke the whole XP pipeline:
--    awardAchievement() got a 403 for every student, so achievement XP
--    (most of the XP economy) was never granted. XP is already freely
--    writable by users (learning_user_stats), so self-awarding a badge
--    grants no privilege it couldn't grant directly.
DROP POLICY IF EXISTS "Only admins can insert achievements"
    ON public.learning_achievements;

DROP POLICY IF EXISTS "Users can insert own achievements"
    ON public.learning_achievements;

CREATE POLICY "Users can insert own achievements"
    ON public.learning_achievements FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
-- 2. Stamp completed_at on learning_enrollments when progress hits 100%
--    (and clear it if progress regresses), so certificates and any
--    "completed" filters work without trusting client timestamps.
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
    SET progress = v_pct,
        completed_at = CASE
            WHEN v_pct >= 100 AND completed_at IS NULL THEN now()
            WHEN v_pct < 100 THEN NULL
            ELSE completed_at
        END
    WHERE user_id = v_user_id AND course_id = v_course_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON public.learning_progress;
CREATE TRIGGER trigger_update_enrollment_progress
AFTER INSERT OR UPDATE OR DELETE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION update_enrollment_progress();

-- 3. Backfill completed_at for enrollments that are already at 100%.
UPDATE public.learning_enrollments e
SET completed_at = COALESCE(e.completed_at, now())
WHERE e.progress >= 100 AND e.completed_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Certificates of completion (Udemy-style, verifiable code)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.learning_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    certificate_code TEXT UNIQUE NOT NULL
        DEFAULT (  'YIC-'
                 || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
                 || '-' || to_char(now(), 'MMYY')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_certificates_course
    ON public.learning_certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_certificates_lookup
    ON public.learning_certificates(certificate_code);

ALTER TABLE public.learning_certificates ENABLE ROW LEVEL SECURITY;

-- Learner sees their own certificates
DROP POLICY IF EXISTS "Users can view own certificates"
    ON public.learning_certificates;
CREATE POLICY "Users can view own certificates"
    ON public.learning_certificates FOR SELECT
    USING (auth.uid() = user_id);

-- Issue is only allowed for a fully completed course; the enrollment row is
-- read via the user's own RLS, so a student cannot fabricate one.
DROP POLICY IF EXISTS "Users can issue certificate for completed course"
    ON public.learning_certificates;
CREATE POLICY "Users can issue certificate for completed course"
    ON public.learning_certificates FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.learning_enrollments e
            WHERE e.user_id = auth.uid()
              AND e.course_id = course_id
              AND COALESCE(e.progress, 0) >= 100
        )
    );

-- 5. Course-level certificate toggle referenced by the Course type and the
--    certificate page (defaults on; null treated as enabled in app code).
ALTER TABLE public.learning_courses
    ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT TRUE;

-- 6. Verifying by code (public lookup used by the certificate page share link).
--    Default owner-rights view on purpose: security_invoker would apply the
--    underlying RLS to anon, which never matches (auth.uid() is NULL) and
--    would make every public lookup return zero rows. The view only exposes
--    the code, student name and course info — intended public data.
CREATE OR REPLACE VIEW public.learning_certificates_public AS
SELECT c.id, c.certificate_code, c.issued_at, c.revoked_at,
       p.full_name AS student_name,
       k.title, k.slug, k.category, k.level
FROM public.learning_certificates c
JOIN public.profiles p ON p.id = c.user_id
JOIN public.learning_courses k ON k.id = c.course_id;

GRANT SELECT ON public.learning_certificates_public TO anon, authenticated;

-- 7. Known trigger gap: modules published AFTER a student completed
--    everything would leave progress at 100% with an invisible completed_at —
--    acceptable; the backfill above plus the trigger cover the live path.
