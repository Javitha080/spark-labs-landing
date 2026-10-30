-- Add a recency stamp to learning_progress.
--
-- The resume feature needs to answer "which module did this student touch
-- last?" for a course. learning_progress only had last_position (seconds into
-- the video), so the client sorted by the largest position, which is wrong: a
-- 40-minute module abandoned at 3:00 outranked a 5-minute module watched 30
-- seconds ago. updated_at gives an honest ordering signal.
--
-- Reuses public.update_updated_at_column(), the trigger function already used by
-- profiles/events/team_members/schedule, so UPDATEs bump the stamp
-- automatically and inserts get DEFAULT now().

ALTER TABLE public.learning_progress
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill: no historical recency exists, so seed from the only timestamp the
-- row can carry. completed_at is NULL for in-progress rows, which keeps them
-- older than completed ones until they are touched again.
UPDATE public.learning_progress
SET updated_at = COALESCE(completed_at, now())
WHERE updated_at IS NULL
   OR (completed_at IS NOT NULL AND completed_at > updated_at);

DROP TRIGGER IF EXISTS update_learning_progress_updated_at ON public.learning_progress;
CREATE TRIGGER update_learning_progress_updated_at
BEFORE UPDATE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The context fetches all progress for one user and groups by course locally;
-- this keeps a per-user scan cheap once the table grows.
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_updated
    ON public.learning_progress(user_id, updated_at DESC);
