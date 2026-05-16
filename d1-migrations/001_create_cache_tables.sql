-- D1 Edge Cache Tables
-- Stores frequently accessed data at the edge to reduce Supabase load

CREATE TABLE IF NOT EXISTS cached_blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT,
  slug TEXT UNIQUE,
  content TEXT,
  author_name TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT,
  cached_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cached_events (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  category TEXT,
  date TEXT,
  created_at TEXT,
  cached_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cached_schedule (
  id TEXT PRIMARY KEY,
  day_of_week INTEGER,
  time TEXT,
  activity TEXT,
  cached_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cache_metadata (
  table_name TEXT PRIMARY KEY,
  last_sync TEXT,
  stale_after_seconds INTEGER DEFAULT 300
);

-- Initialize cache metadata with default stale times
INSERT OR IGNORE INTO cache_metadata (table_name, stale_after_seconds) VALUES ('cached_blog_posts', 300);
INSERT OR IGNORE INTO cache_metadata (table_name, stale_after_seconds) VALUES ('cached_events', 300);
INSERT OR IGNORE INTO cache_metadata (table_name, stale_after_seconds) VALUES ('cached_schedule', 300);
