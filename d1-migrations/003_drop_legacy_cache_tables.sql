-- Drop legacy schema-coupled D1 cache tables.
--
-- These tables were created by an earlier design that mirrored the Supabase
-- schema into D1 (one D1 table per Supabase table). The Worker tried to
-- INSERT into them using the real Supabase row shape, which doesn't match
-- the column lists below, so every write has been failing silently since
-- day one. The schedule endpoint has been migrated to use `cached_json`
-- (see 002_create_json_cache.sql) for a uniform, schema-agnostic cache.
--
-- `migrations_dir` is set on the D1 binding in wrangler.json, so wrangler
-- applies this file the next time `wrangler deploy` runs. Safe to re-run.

DROP TABLE IF EXISTS cached_blog_posts;
DROP TABLE IF EXISTS cached_events;
DROP TABLE IF EXISTS cached_schedule;
DROP TABLE IF EXISTS cache_metadata;
