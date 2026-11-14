-- ═══════════════════════════════════════════════════════════════════════════
-- Create public.cached_json.
--
-- Production created this table outside the migration set (it mirrors the D1
-- edge-cache table in d1-migrations/002_create_json_cache.sql), but
-- 20260711043013 alters it — so a fresh `supabase db push` used to fail with
-- `relation "public.cached_json" does not exist`. This migration now owns its
-- creation; the later migration re-states the same RLS/grant posture, which is
-- idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cached_json (
  cache_key   TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,             -- serialized JSON
  cached_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 300
);

CREATE INDEX IF NOT EXISTS idx_cached_json_cached_at ON public.cached_json (cached_at);

-- Service-role-only table: anon/authenticated get nothing.
ALTER TABLE public.cached_json ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cached_json FROM anon;
REVOKE ALL ON public.cached_json FROM authenticated;
GRANT ALL ON public.cached_json TO service_role;
