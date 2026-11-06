-- ═══════════════════════════════════════════════════════════════════════════
-- Learning Hub: quiz engine, course announcements, and student notifications.
--
-- 1. learning_quiz_questions — the "quiz" module type existed as a dead
--    select-item (CourseBuilder) with no data and no renderer. Questions are
--    formative: wrong options must be readable to the student taking the quiz,
--    so SELECT is granted to all authenticated users and correctness is not
--    hidden (a separate grading service would need to be built for that).
-- 2. learning_announcements — Udemy-style instructor announcements. Students
--    read published rows for the courses they can see; draft rows stay
--    content-admin-only in one policy. Publishing fans out a notification
--    snapshot to currently-enrolled students (see trigger below).
-- 3. learning_notifications — in-app student notification feed. Only the
--    owner reads/updates; INSERT is reserved for the SECURITY DEFINER
--    triggers (and service role), so nothing can be written client-side.
--    Frontend listens via supabase_realtime for live bell updates.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1 ── Quiz questions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index INT NOT NULL DEFAULT 0,
    explanation TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT quiz_options_must_be_array CHECK (jsonb_typeof(options) = 'array'),
    CONSTRAINT quiz_correct_index_valid CHECK (correct_index >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_module
    ON public.learning_quiz_questions(module_id, display_order);

ALTER TABLE public.learning_quiz_questions ENABLE ROW LEVEL SECURITY;

-- Quizzes are formative: every option must be readable to the one answering it.
DROP POLICY IF EXISTS "Authenticated can view quiz questions"
    ON public.learning_quiz_questions;
CREATE POLICY "Authenticated can view quiz questions"
    ON public.learning_quiz_questions FOR SELECT
    TO authenticated
    USING (true);

-- Authoring is content-admin-only (same bridge used by every learning table).
DROP POLICY IF EXISTS "Content admins can manage quiz questions"
    ON public.learning_quiz_questions;
CREATE POLICY "Content admins can manage quiz questions"
    ON public.learning_quiz_questions FOR ALL
    TO authenticated
    USING (public.is_content_admin(auth.uid()))
    WITH CHECK (public.is_content_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON public.learning_quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
BEFORE UPDATE ON public.learning_quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2 ── Course announcements ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    -- Author is the CMS user's auth uuid; nullable so the row survives the
    -- author leaving the club (announcements belong to the course, not them).
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_course
    ON public.learning_announcements(course_id, created_at DESC);

ALTER TABLE public.learning_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published announcements are visible, drafts to admins"
    ON public.learning_announcements;
CREATE POLICY "Published announcements are visible, drafts to admins"
    ON public.learning_announcements FOR SELECT
    TO authenticated
    USING (is_published = TRUE OR public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can manage announcements"
    ON public.learning_announcements;
CREATE POLICY "Content admins can manage announcements"
    ON public.learning_announcements FOR ALL
    TO authenticated
    USING (public.is_content_admin(auth.uid()))
    WITH CHECK (public.is_content_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.learning_announcements;
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.learning_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3 ── Student notifications ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- 'qa_reply' | 'review_reply' | 'announcement' (open union for the future)
    type TEXT NOT NULL,
    title TEXT,
    body TEXT,
    link TEXT,
    course_id UUID REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
    ON public.learning_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.learning_notifications(user_id)
    WHERE is_read = FALSE;

ALTER TABLE public.learning_notifications ENABLE ROW LEVEL SECURITY;

-- The owner reads and may only clear their own feed; no INSERT policy on
-- purpose — every insert happens inside the SECURITY DEFINER triggers below
-- (or service_role), so notifications can't be forged client-side.
DROP POLICY IF EXISTS "Users can view own notifications"
    ON public.learning_notifications;
CREATE POLICY "Users can view own notifications"
    ON public.learning_notifications FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can mark own notifications read"
    ON public.learning_notifications;
CREATE POLICY "Users can mark own notifications read"
    ON public.learning_notifications FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications"
    ON public.learning_notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.learning_notifications FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- ══ Automation: SECURITY DEFINER triggers that write the feed ══════════════

-- Teacher answered a Q&A thread the student participates in.
CREATE OR REPLACE FUNCTION public.fn_notify_discussion_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    thread_owner UUID;
    course_slug TEXT;
BEGIN
    -- Only replies (a question without parent_id notifies nothing) and never
    -- the responder's own thread.
    IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
    IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

    SELECT d.user_id INTO thread_owner
    FROM public.learning_discussions d
    WHERE d.id = NEW.parent_id;

    IF thread_owner IS NULL OR thread_owner = NEW.user_id THEN RETURN NEW; END IF;

    SELECT k.slug INTO course_slug
    FROM public.learning_courses k
    WHERE k.id = NEW.course_id;

    INSERT INTO public.learning_notifications (user_id, type, title, body, link, course_id)
    VALUES (
        thread_owner,
        'qa_reply',
        CASE WHEN NEW.is_instructor_answer IS TRUE
             THEN 'Your instructor replied to your question'
             ELSE 'New reply on your question' END,
        left(NEW.content, 160),
        CASE WHEN course_slug IS NOT NULL
             THEN '/learning-hub/course/' || course_slug END,
        NEW.course_id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_discussion_reply ON public.learning_discussions;
CREATE TRIGGER trigger_notify_discussion_reply
AFTER INSERT ON public.learning_discussions
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_discussion_reply();

-- Instructor responded to a student review.
CREATE OR REPLACE FUNCTION public.fn_notify_review_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    course_slug TEXT;
BEGIN
    -- Fire once, when a reply appears (was blank before).
    IF NEW.admin_reply IS NULL OR NEW.admin_reply = '' THEN RETURN NEW; END IF;
    IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
    IF OLD.admin_reply IS NOT NULL AND OLD.admin_reply <> '' THEN RETURN NEW; END IF;

    SELECT k.slug INTO course_slug
    FROM public.learning_courses k
    WHERE k.id = NEW.course_id;

    INSERT INTO public.learning_notifications (user_id, type, title, body, link, course_id)
    VALUES (
        NEW.user_id,
        'review_reply',
        'Your review received a response',
        left(NEW.admin_reply, 160),
        CASE WHEN course_slug IS NOT NULL
             THEN '/learning-hub/course/' || course_slug END,
        NEW.course_id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_review_reply ON public.learning_reviews;
CREATE TRIGGER trigger_notify_review_reply
AFTER UPDATE ON public.learning_reviews
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_review_reply();

-- Announcement published → snapshot to currently-enrolled students.
CREATE OR REPLACE FUNCTION public.fn_announcement_fanout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    course_slug TEXT;
BEGIN
    IF NEW.is_published IS NOT TRUE THEN RETURN NEW; END IF;

    SELECT k.slug INTO course_slug
    FROM public.learning_courses k
    WHERE k.id = NEW.course_id;

    INSERT INTO public.learning_notifications (user_id, type, title, body, link, course_id)
    SELECT e.user_id,
           'announcement',
           'New announcement: ' || NEW.title,
           left(NEW.body, 160),
           CASE WHEN course_slug IS NOT NULL
                THEN '/learning-hub/course/' || course_slug END,
           NEW.course_id
    FROM public.learning_enrollments e
    WHERE e.course_id = NEW.course_id
      AND e.user_id IS NOT NULL
      AND e.user_id <> NEW.user_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_announcement_fanout ON public.learning_announcements;
CREATE TRIGGER trigger_announcement_fanout
AFTER INSERT ON public.learning_announcements
FOR EACH ROW EXECUTE FUNCTION public.fn_announcement_fanout();

-- 4 ── Admin visibility for certificates (Certificates CMS tab) ────────────
-- Students keep their own-only view; admins get audit-style read + revoke.
DROP POLICY IF EXISTS "Content admins can view all certificates"
    ON public.learning_certificates;
CREATE POLICY "Content admins can view all certificates"
    ON public.learning_certificates FOR SELECT
    TO authenticated
    USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can revoke certificates"
    ON public.learning_certificates;
CREATE POLICY "Content admins can revoke certificates"
    ON public.learning_certificates FOR UPDATE
    TO authenticated
    USING (public.is_content_admin(auth.uid()))
    WITH CHECK (public.is_content_admin(auth.uid()));

-- 5 ── Realtime publications (live bell + live announcement dialog) ────────
DO $$
DECLARE _t TEXT;
BEGIN
    FOREACH _t IN ARRAY ARRAY['learning_announcements', 'learning_notifications'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = _t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _t);
        END IF;
    END LOOP;
END $$;
