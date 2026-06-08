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

// Skip the edge entirely on hosts that we know don't run our Worker
// (Lovable preview / sandbox subdomains, plain localhost). On those hosts
// `/api/*` is intercepted by the platform and returns a 200 HTML login page,
// which would otherwise waste a fetch and a JSON.parse error per page load
// before the Supabase fallback kicks in.
function edgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return false;
  if (h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com")) return false;
  return true;
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EDGE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonOrThrow<T>(url: string): Promise<T> {
  if (!edgeAvailable()) throw new Error(`edge ${url} skipped (non-prod host)`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`edge ${url} ${res.status}`);
  // Guard against hosts that return a 200 HTML page for unknown routes
  // (Lovable preview does this) — without this check JSON.parse would throw
  // a SyntaxError that's harder to attribute.
  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("application/json")) {
    throw new Error(`edge ${url} non-JSON response (${ctype || "no content-type"})`);
  }
  return (await res.json()) as T;
}

/** Fetch the cached list of published blog posts. Throws on non-2xx / network error. */
export async function fetchCachedBlogPosts<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T[]>("/api/blog/posts");
}

/** Fetch the cached list of events. Throws on non-2xx / network error. */
export async function fetchCachedEvents<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T[]>("/api/events");
}

/** Fetch the cached list of gallery items. Throws on non-2xx / network error. */
export async function fetchCachedGallery<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T[]>("/api/gallery");
}

/** Fetch the cached list of projects. Throws on non-2xx / network error. */
export async function fetchCachedProjects<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T[]>("/api/projects");
}

/**
 * Bust an edge cache after an admin write. Requires a valid Supabase
 * admin/editor session — sends the access token as Bearer auth.
 *
 * Known keys: "blog_posts", "events", "cached_schedule", "gallery", "projects".
 * Safe to call from the frontend; failures are logged and swallowed so
 * a cache-bust failure never breaks the write that just succeeded.
 */
export async function invalidateEdgeCache(
  key: "blog_posts" | "events" | "cached_schedule" | "gallery" | "projects"
): Promise<void> {
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

// Map of Supabase table names to the edge-cache keys that may have been
// populated from them. Call this after any admin write so the next public
// read goes straight to Supabase instead of serving stale D1/CF-cached data.
//
// Tables not listed here either have no public cache (writes invalidate
// themselves) or are private (never read publicly). Add new entries as new
// cacheable endpoints are added.
const TABLE_TO_CACHE_KEY: Record<string, "blog_posts" | "events" | "cached_schedule" | "gallery" | "projects"> = {
  blog_posts: "blog_posts",
  events: "events",
  schedule: "cached_schedule",
  gallery_items: "gallery",
  projects: "projects",
};

/**
 * Convenience wrapper: invalidate every cache key that may have been
 * populated from the given table. Use after admin INSERT / UPDATE / DELETE
 * on a tracked table. Safe to call when the user is not signed in.
 */
export async function invalidateForTable(
  table: keyof typeof TABLE_TO_CACHE_KEY
): Promise<void> {
  const key = TABLE_TO_CACHE_KEY[table];
  if (key) await invalidateEdgeCache(key);
}
