/**
 * D1 Edge Cache Utilities
 *
 * Stores serialized JSON blobs keyed by a logical cache name in the
 * `cached_json` D1 table (see d1-migrations/002_create_json_cache.sql).
 * Avoids per-table schema coupling — each row is just `{ cache_key, payload,
 * cached_at, ttl_seconds }` so any Supabase query result can be cached
 * without mirroring the source table's columns.
 *
 * Read path: getJsonCache returns null if the row is missing OR past its TTL.
 * Write path: setJsonCache upserts with a fresh `cached_at` and TTL.
 * Invalidate: invalidateJsonCache deletes the row, so the next read misses
 *             and falls through to Supabase.
 */

import type { D1Database } from "@cloudflare/workers-types";

export async function getJsonCache<T = unknown>(
  db: D1Database,
  key: string
): Promise<T | null> {
  try {
    const row = await db
      .prepare(
        "SELECT payload, cached_at, ttl_seconds FROM cached_json WHERE cache_key = ?"
      )
      .bind(key)
      .first<{ payload: string; cached_at: string; ttl_seconds: number }>();
    if (!row) return null;

    // cached_at is stored as ISO-8601 in UTC. SQLite's datetime('now') returns
    // a space-separated string ("YYYY-MM-DD HH:MM:SS") which Date() can't parse
    // as UTC — append the Z so we get a deterministic UTC instant.
    const cachedAt = new Date(row.cached_at.endsWith("Z") ? row.cached_at : row.cached_at + "Z").getTime();
    if (Number.isNaN(cachedAt)) return null;
    if (Date.now() - cachedAt > row.ttl_seconds * 1000) return null;

    return JSON.parse(row.payload) as T;
  } catch (err) {
    console.error(`[edge-cache] getJsonCache failed for ${key}:`, err);
    return null;
  }
}

export async function setJsonCache(
  db: D1Database,
  key: string,
  payload: unknown,
  ttlSeconds = 300
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO cached_json (cache_key, payload, ttl_seconds, cached_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(cache_key) DO UPDATE SET
           payload = excluded.payload,
           ttl_seconds = excluded.ttl_seconds,
           cached_at = excluded.cached_at`
      )
      .bind(key, JSON.stringify(payload), ttlSeconds)
      .run();
  } catch (err) {
    console.error(`[edge-cache] setJsonCache failed for ${key}:`, err);
  }
}

export async function invalidateJsonCache(
  db: D1Database,
  key: string
): Promise<void> {
  try {
    await db
      .prepare("DELETE FROM cached_json WHERE cache_key = ?")
      .bind(key)
      .run();
  } catch (err) {
    console.error(`[edge-cache] invalidateJsonCache failed for ${key}:`, err);
  }
}
