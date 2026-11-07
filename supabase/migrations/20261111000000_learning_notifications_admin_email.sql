-- Re-runnable: safe to apply via the Supabase dashboard SQL editor.
-- Purpose: let CMS admins drain the learning-notification email pipeline from
-- the Worker WITHOUT the service-role key. The Worker's /api/notify-emails/tick
-- route runs under the calling admin's own JWT (RLS-native mode), so it needs
-- SELECT to read pending rows (plus the embedded profiles.email join) and
-- UPDATE to mark rows sent/skipped. The owner-only policies from
-- 20261106000000 continue to govern students - these add admin rights only.

DROP POLICY IF EXISTS "CMS admins process notification emails select"
    ON public.learning_notifications;
CREATE POLICY "CMS admins process notification emails select"
    ON public.learning_notifications
    FOR SELECT
    TO authenticated
    USING (
      public.is_admin(auth.uid())
      OR public.is_content_admin(auth.uid())
    );

DROP POLICY IF EXISTS "CMS admins process notification emails update"
    ON public.learning_notifications;
CREATE POLICY "CMS admins process notification emails update"
    ON public.learning_notifications
    FOR UPDATE
    TO authenticated
    USING (
      public.is_admin(auth.uid())
      OR public.is_content_admin(auth.uid())
    )
    WITH CHECK (
      public.is_admin(auth.uid())
      OR public.is_content_admin(auth.uid())
    );
