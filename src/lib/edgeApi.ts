/**
 * Thin wrappers around the Cloudflare Worker edge-cached endpoints.
 *
 * These hit `/api/*` on the same origin. In production the Worker serves
 * them from D1 → CF cache → Supabase. In Lovable preview / `npm run dev`
 * the worker may not be available, so callers should treat any failure as
 * "use the direct Supabase client instead".
 */

import { supabase } from "@/integrations/supabase/client";

const EDGE_TIMEOUT_MS = 4_000;

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EDGE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch the cached list of published blog posts. Throws on non-2xx / network error. */
export async function fetchCachedBlogPosts<T = unknown>(): Promise<T[]> {
  const res = await fetchWithTimeout("/api/blog/posts");
  if (!res.ok) throw new Error(`edge /api/blog/posts ${res.status}`);
  return (await res.json()) as T[];
}

/** Fetch the cached list of events. Throws on non-2xx / network error. */
export async function fetchCachedEvents<T = unknown>(): Promise<T[]> {
  const res = await fetchWithTimeout("/api/events");
  if (!res.ok) throw new Error(`edge /api/events ${res.status}`);
  return (await res.json()) as T[];
}

/**
 * Bust an edge cache after an admin write. Requires a valid Supabase
 * admin/editor session — sends the access token as Bearer auth.
 *
 * Known keys: "blog_posts", "events", "cached_schedule".
 * Safe to call from the frontend; failures are logged and swallowed so
 * a cache-bust failure never breaks the write that just succeeded.
 */
export async function invalidateEdgeCache(key: "blog_posts" | "events" | "cached_schedule"): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return; // not signed in as admin — nothing to invalidate as us
    const res = await fetchWithTimeout(`/api/cache/invalidate/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn(`[edgeApi] invalidate ${key} returned ${res.status}`);
    }
  } catch (err) {
    console.warn(`[edgeApi] invalidate ${key} failed`, err);
  }
}
