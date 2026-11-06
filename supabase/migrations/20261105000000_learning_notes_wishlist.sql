-- ═══════════════════════════════════════════════════════════════════════════
-- Learning Hub: cross-device classroom notes + course wishlist.
--
-- 1. learning_notes — classroom note-taking has been localStorage-only
--    (classroom-note-{courseId}-{moduleId}); a student switching browser or
--    device lost every note. This table is the durable copy: the client keeps
--    writing to localStorage as the instant cache and upserts here debounced.
--    One note per (user, module) — the UNIQUE constraint makes the client
--    upsert idempotent regardless of ordering.
--
-- 2. learning_wishlist — the remaining Udemy parity gap: save a course for
--    later from the catalog/course page and review the saved list in
--    My Learning. Wishlist rows are only the learner's own; courses cascade
--    when a course is deleted from the CMS.
--
-- Both tables reference public.profiles(id) like learning_certificates
-- (20261030000000), the most recent user-column convention in this schema.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1 ── Classroom notes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_notes_module
    ON public.learning_notes(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_course
    ON public.learning_notes(user_id, course_id);

ALTER TABLE public.learning_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notes"
    ON public.learning_notes;
CREATE POLICY "Users can view own notes"
    ON public.learning_notes FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own notes"
    ON public.learning_notes;
CREATE POLICY "Users can insert own notes"
    ON public.learning_notes FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notes"
    ON public.learning_notes;
CREATE POLICY "Users can update own notes"
    ON public.learning_notes FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own notes"
    ON public.learning_notes;
CREATE POLICY "Users can delete own notes"
    ON public.learning_notes FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- Same updated_at stamp learning_progress uses, so a future "edited notes"
-- list can order by recency without trusting the client.
DROP TRIGGER IF EXISTS update_learning_notes_updated_at ON public.learning_notes;
CREATE TRIGGER update_learning_notes_updated_at
BEFORE UPDATE ON public.learning_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2 ── Wishlist ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_wishlist_course
    ON public.learning_wishlist(course_id);

ALTER TABLE public.learning_wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wishlist"
    ON public.learning_wishlist;
CREATE POLICY "Users can view own wishlist"
    ON public.learning_wishlist FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can add to own wishlist"
    ON public.learning_wishlist;
CREATE POLICY "Users can add to own wishlist"
    ON public.learning_wishlist FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

-- Delete replaces "remove from wishlist"; there is no UPDATE path, so a row
-- can never be reassigned to another user.
DROP POLICY IF EXISTS "Users can remove from own wishlist"
    ON public.learning_wishlist;
CREATE POLICY "Users can remove from own wishlist"
    ON public.learning_wishlist FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);
