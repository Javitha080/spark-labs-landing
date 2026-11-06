-- Learning Hub enrollment archive (Phase 3 deferred-parity item)
-- Students can hide finished or parked courses from their active My Learning
-- tabs without unenrolling. Course access, progress and certificates are
-- untouched - this is purely a visibility flag.
--
-- No new RLS policy is needed: the existing owner policies carry the column
-- end to end -
--   "Users can view their own enrollments" (SELECT) reads the flag, and
--   "Users can update their own progress" (UPDATE) sets it: USING
--   (auth.uid() = user_id) with WITH CHECK defaulting to USING, so a student
--   can only re-archive or restore their own enrollment rows.
--
-- Re-runnable: ADD COLUMN IF NOT EXISTS no-ops once applied.

ALTER TABLE public.learning_enrollments
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.learning_enrollments.is_archived IS
    'Student-managed visibility flag: true hides the course from the active My Learning tabs without unenrolling.';
