-- Learning Hub: email delivery for student notifications (Phase 3, last item)
--
-- The in-app feed (learning_notifications) is written by SECURITY DEFINER
-- triggers (qa_reply / review_reply / announcement fanout, see migration
-- 20261106000000). This migration adds the delivery state the Worker cron
-- needs to turn pending feed rows into Lettermint emails:
--
--   pending  -> not yet processed by the Worker cron
--   sent     -> handed to the email pipeline (EMAIL_QUEUE / Lettermint,
--               idempotency key `learnmail:<notification id>` dedupes a
--               re-fetch that races a crash between send and mark)
--   skipped  -> no mailable address (profiles.email empty/invalid)
--
-- No RLS changes: the notify feeds already have no INSERT policy (trigger
-- -written only), the owner SELECT/UPDATE policies are unaffected by the new
-- column, and the Worker reads rows with the service-role key.
--
-- Emailing means the student can no longer avoid it per-notification; a
-- per-student email preference is a documented follow-up (system audit
-- addendum), not wired here.
--
-- Re-runnable: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS both
-- no-op once applied.

ALTER TABLE public.learning_notifications
    ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sent', 'skipped'));

-- The cron polls the oldest pending rows; the partial index keeps that scan
-- empty-and-cheap once the backlog is cleared.
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending
    ON public.learning_notifications(created_at)
    WHERE email_status = 'pending';

COMMENT ON COLUMN public.learning_notifications.email_status IS
    'Email delivery state for the Worker cron: pending (default) / sent (queued to the Lettermint pipeline) / skipped (no mailable address).';
