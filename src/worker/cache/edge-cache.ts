/**
 * D1 Edge Cache Utilities
 * Implements cache-then-network pattern for frequently accessed data.
 * Reduces Supabase load by caching data at the edge in D1 (SQLite).
 */

import type { D1Database } from "@cloudflare/workers-types";

interface CacheConfig {
  tableName: string;
  staleAfterSeconds?: number;
  primaryKey?: string;
}

/**
 * Check if cached data is stale based on cache_metadata table.
 */
export async function isCacheStale(
  db: D1Database,
  tableName: string,
  defaultStaleSeconds: number = 300
): Promise<boolean> {
  try {
    const result = await db.prepare(
      "SELECT last_sync, stale_after_seconds FROM cache_metadata WHERE table_name = ?"
    ).bind(tableName).first<{ last_sync: string; stale_after_seconds: number }>();

    if (!result) {
      // No metadata found — treat as stale
      return true;
    }

    const staleAfter = result.stale_after_seconds || defaultStaleSeconds;
    const lastSync = new Date(result.last_sync).getTime();
    const now = Date.now();

    return (now - lastSync) > (staleAfter * 1000);
  } catch {
    // If metadata check fails, treat as stale
    return true;
  }
}

/**
 * Get cached data from D1.
 * Returns null if cache is stale or empty.
 */
async function getCachedData<T>(
  db: D1Database,
  tableName: string,
  query: string,
  params: unknown[] = []
): Promise<T[] | null> {
  try {
    const isStale = await isCacheStale(db, tableName);
    if (isStale) {
      return null;
    }

    const result = await db.prepare(query).bind(...params).all<T>();
    return result.results && result.results.length > 0 ? result.results : null;
  } catch (err) {
    console.error(`[edge-cache] getCachedData failed for ${tableName}:`, err);
    return null;
  }
}

/**
 * Cache data in D1 by upserting rows.
 * Updates cache_metadata with current timestamp.
 */
async function cacheData(
  db: D1Database,
  tableName: string,
  rows: Array<Record<string, unknown>>,
  primaryKey: string = "id"
): Promise<void> {
  if (rows.length === 0) return;

  try {
    // Build upsert query dynamically
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const updates = columns
      .filter(col => col !== primaryKey)
      .map(col => `${col} = excluded.${col}`)
      .join(", ");

    const query = `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES (${placeholders})
      ON CONFLICT(${primaryKey}) DO UPDATE SET
        ${updates},
        cached_at = datetime('now')
    `;

    // Execute upserts in batches
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      await db.prepare(query).bind(...values).run();
    }

    // Update cache metadata
    await db.prepare(
      "INSERT OR REPLACE INTO cache_metadata (table_name, last_sync, stale_after_seconds) VALUES (?, datetime('now'), 300)"
    ).bind(tableName).run();
  } catch (err) {
    console.error(`[edge-cache] cacheData failed for ${tableName}:`, err);
  }
}

/**
 * Invalidate cache for a specific table.
 * Use this after admin updates content.
 */
export async function invalidateCache(
  db: D1Database,
  tableName: string
): Promise<void> {
  try {
    await db.prepare(
      "UPDATE cache_metadata SET last_sync = datetime('1970-01-01') WHERE table_name = ?"
    ).bind(tableName).run();
  } catch (err) {
    console.error(`[edge-cache] invalidateCache failed for ${tableName}:`, err);
  }
}

/**
 * Get schedule data from D1 cache.
 */
export async function getCachedSchedule(db: D1Database) {
  return getCachedData(db, "cached_schedule", "SELECT * FROM cached_schedule ORDER BY day_of_week");
}

/**
 * Cache schedule data in D1.
 */
export async function cacheSchedule(
  db: D1Database,
  schedule: Array<Record<string, unknown>>
) {
  return cacheData(db, "cached_schedule", schedule);
}


/**
 * Cache blog posts in D1.
 */
export async function cacheBlogPosts(
  db: D1Database,
  posts: Array<Record<string, unknown>>
) {
  return cacheData(db, "cached_blog_posts", posts);
}

/**
 * Get events from D1 cache.
 */
export async function getCachedEvents(db: D1Database) {
  return getCachedData(db, "cached_events", "SELECT * FROM cached_events ORDER BY date DESC");
}

/**
 * Cache events in D1.
 */
export async function cacheEvents(
  db: D1Database,
  events: Array<Record<string, unknown>>
) {
  return cacheData(db, "cached_events", events);
}
