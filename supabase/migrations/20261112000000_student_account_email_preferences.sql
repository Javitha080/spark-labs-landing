-- Re-runnable: safe to apply via the Supabase dashboard SQL editor.
-- Per-student email opt-out for the learning-notification pipeline (audit
-- §10.2): default TRUE preserves today's behavior for every existing student;
-- students who set FALSE in /student/dashboard get their pending rows marked
-- "skipped" by the email drain (never emailed, never retried).
-- RLS: no new policies - "students_read_own"/"students_update_own"
-- (20260519) already cover owner read/update of the row.

ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.student_accounts.email_notifications IS
  'Per-student opt-out for learning-notification emails: FALSE skips the
   pipeline (pending rows are marked skipped, not retried). Default TRUE.';
