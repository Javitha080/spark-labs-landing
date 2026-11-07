-- ═══════════════════════════════════════════════════════════════════════════
-- Anon-writable path for newsletter_subscribers via SECURITY DEFINER RPC.
--
-- Migration 20261113000000 revoked all table privileges from anon/authenticated
-- assuming the Worker writes with SUPABASE_SERVICE_ROLE_KEY. On this production
-- Worker no such secret exists (the database is externally managed - audit
-- §10.3), so the /api/newsletter-subscribe upsert actually runs under the
-- publishable/anon role and hit `42501 permission denied` (verified live:
-- {"success":true,"stored":false} in the browser).
--
-- This function is the one deliberate write surface across that revoke:
--   * SECURITY DEFINER so it inserts as the table owner, bypassing the
--     empty-policy RLS exactly like the service role would.
--   * Mirrors the Worker's own validation (EMAIL_RE, ≤254 chars) because the
--     function stays callable straight through PostgREST by anyone holding the
--     publishable key; callers cannot skip the Worker's Turnstile/origin
--     checks, so this is enforced again here.
--   * Returns only a boolean - no subscriber data is readable through it.
--   * Constrained p_source; anything odd falls back to 'footer'.
--
-- Re-runnable: safe to apply via the Supabase dashboard SQL editor.
-- Table + RLS/revoke + updated_at trigger: 20261113000000 (required first).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.insert_newsletter_subscriber(
    p_email  text,
    p_source text DEFAULT 'footer'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Lowercase + trim before validating (the unique index is on the
    -- lowercased form; the Worker lowercases before calling).
    p_email := lower(btrim(p_email));
    IF p_email IS NULL OR length(p_email) = 0 OR length(p_email) > 254 THEN
        RETURN false;
    END IF;

    -- Same shape regex as the Worker's EMAIL_RE (index.ts).
    IF p_email !~ '^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$' THEN
        RETURN false;
    END IF;

    p_source := lower(btrim(coalesce(p_source, '')));
    IF p_source = '' OR length(p_source) > 32
       OR p_source !~ '^[a-z0-9_-]+$' THEN
        p_source := 'footer';
    END IF;

    INSERT INTO public.newsletter_subscribers
        (email, source, status, unsubscribed_at, last_subscribed_at)
    VALUES
        (p_email, p_source, 'subscribed', NULL, now())
    ON CONFLICT (email) DO UPDATE
        SET source           = EXCLUDED.source,
            status           = 'subscribed',
            -- A re-subscribe after an unsubscribe clears the opt-out date;
            -- first_subscribed_at keeps its original value, and the table's
            -- BEFORE UPDATE trigger refreshes updated_at.
            unsubscribed_at  = NULL,
            last_subscribed_at = EXCLUDED.last_subscribed_at;

    RETURN true;
END;
$$;

-- EXECUTE is granted to PUBLIC on new functions by default; with SECURITY
-- DEFINER over a revoked table that default privilege must not survive.
REVOKE ALL ON FUNCTION public.insert_newsletter_subscriber(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_newsletter_subscriber(text, text)
    TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.insert_newsletter_subscriber(text, text) IS
  'Verifies and upserts a newsletter subscriber. SECURITY DEFINER because the
   production Worker has no SUPABASE_SERVICE_ROLE_KEY (externally managed DB,
   audit §10.3) and 20261113000000 blocks direct anon table access. Returns
   false instead of raising for invalid input so PostgREST callers get a
   normal 200.';

-- Keep the table comment truthful: writes no longer imply service role.
COMMENT ON TABLE public.newsletter_subscribers IS
  'Footer newsletter requests. Writes go through insert_newsletter_subscriber()
   (SECURITY DEFINER; the Worker runs under the anon role because no service
   key exists), or the service role when configured. The admin-inbox
   notification email mirrors the row and may bounce safely.';
