-- Generic JSON blob edge cache.
-- Lets us cache arbitrary Supabase query results at the edge without
-- coupling the D1 schema to each table's columns.

CREATE TABLE IF NOT EXISTS cached_json (
  cache_key   TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,           -- serialized JSON
  cached_at   TEXT NOT NULL DEFAULT (datetime('now')),
  ttl_seconds INTEGER NOT NULL DEFAULT 300
);

CREATE INDEX IF NOT EXISTS idx_cached_json_cached_at ON cached_json(cached_at);
