-- ═══════════════════════════════════════════════════════════════════════════
-- Newsletter subscriptions as a durable record.
--
-- Until now a subscription was only ever an email to the admin inbox
-- (ADMIN_INBOX), so the Nov 2026 hard bounce of that notification destroyed
-- the request outright - no row existed anywhere. The footer form now upserts
-- here BEFORE the notification email is queued; the email is advisory.
--
-- Access model: RLS enabled with ZERO policies. Subscriber addresses are
-- personal data and must never be readable through anon/authenticated
-- PostgREST calls; the Worker writes with the service role (bypasses RLS) and
-- admins can read via SQL. Re-subscribing clears unsubscribed_at and refreshes
-- last_subscribed_at (handled by the Worker's upsert + the updated_at trigger).
-- ═══════════════════════════════════════════════════════════════════════════

-- Re-runnable: safe to apply via the Supabase dashboard SQL editor.
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Lowercased + shape-validated by the Worker (isValidEmail) before insert.
    email TEXT NOT NULL,
    -- Which surface produced the row ('footer' today).
    source TEXT NOT NULL DEFAULT 'footer',
    -- 'subscribed' | 'unsubscribed' (set from bounce/unsubscribe handling later).
    status TEXT NOT NULL DEFAULT 'subscribed'
        CHECK (status IN ('subscribed', 'unsubscribed')),
    first_subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
    ON public.newsletter_subscribers (email);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Defense in depth beyond the empty policy set: RLS with no policies already
-- blocks anon/authenticated; the explicit revoke removes any table-level grant
-- and keeps future default-privilege changes from resurrecting access.
REVOKE ALL ON public.newsletter_subscribers FROM anon;
REVOKE ALL ON public.newsletter_subscribers FROM authenticated;

DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at
    ON public.newsletter_subscribers;
CREATE TRIGGER update_newsletter_subscribers_updated_at
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.newsletter_subscribers IS
  'Footer newsletter requests. Written only by the Worker (service role); the
   admin-inbox notification email mirrors the row and may bounce safely.';
COMMENT ON COLUMN public.newsletter_subscribers.status IS
  'subscribed | unsubscribed. The Worker upsert clears unsubscribed_at on
   re-subscribe; email_preferences opt-out does NOT apply here (different list).';
