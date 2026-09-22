/**
 * Thin wrappers around the Cloudflare Worker edge-cached endpoints.
 *
 * Request path: `/api/*` on the same origin → Worker → D1 JSON cache →
 * Cloudflare Cache API → Supabase. This module adds the client-side half of
 * the resilience story:
 *
 *  1. timeout per attempt (no hanging requests),
 *  2. bounded retries with exponential backoff + jitter for transient
 *     failures only (network error, 408/425/429/5xx) — never for 4xx,
 *  3. `Retry-After` is honoured when the edge rate-limits us,
 *  4. an in-memory stale copy of the last good payload, served if every
 *     attempt AND the Supabase fallback fail (stale-if-error),
 *  5. `fetchWithFallback` so every caller gets the same
 *     edge → Supabase → stale → empty ladder without repeating the logic.
 *
 * Hosts that don't run our Worker (localhost, Lovable preview) are skipped
 * entirely, because there `/api/*` answers 200 with an HTML page.
 */

import { supabase } from "@/integrations/supabase/client";

const EDGE_TIMEOUT_MS = 4_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 2_000;
const STALE_TTL_MS = 10 * 60 * 1000;

export class EdgeFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "EdgeFetchError";
  }
}

/** Last successful payload per URL, used as a last-resort fallback. */
const staleCache = new Map<string, { data: unknown; at: number }>();

function readStale<T>(url: string): T[] | null {
  const hit = staleCache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > STALE_TTL_MS) return null;
  return hit.data as T[];
}

function edgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return false;
  if (h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com")) return false;
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffDelay(attempt: number, retryAfterHeader?: string | null): number {
  const retryAfter = retryAfterHeader ? Number.parseFloat(retryAfterHeader) : NaN;
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, MAX_BACKOFF_MS);
  }
  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  return exponential + Math.random() * 120; // jitter avoids retry stampedes
}

const isRetryableStatus = (status: number) =>
  status === 408 || status === 425 || status === 429 || status >= 500;

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EDGE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** One attempt: throws `EdgeFetchError` tagged retryable/terminal. */
async function attemptJson<T>(url: string): Promise<T[]> {
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    // Network failure / abort — always worth one more try.
    throw new EdgeFetchError(
      `edge ${url} network error: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      true,
    );
  }

  if (!res.ok) {
    throw new EdgeFetchError(`edge ${url} ${res.status}`, res.status, isRetryableStatus(res.status));
  }

  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("application/json")) {
    // A proxy/login page answered instead of the Worker — retrying won't help.
    throw new EdgeFetchError(`edge ${url} non-JSON response (${ctype || "no content-type"})`, res.status, false);
  }

  try {
    return (await res.json()) as T[];
  } catch (err) {
    throw new EdgeFetchError(
      `edge ${url} malformed JSON: ${err instanceof Error ? err.message : String(err)}`,
      res.status,
      false,
    );
  }
}

/** Fetch JSON from the edge with retries. Throws once all attempts fail. */
async function fetchJsonOrThrow<T>(url: string): Promise<T[]> {
  if (!edgeAvailable()) throw new EdgeFetchError(`edge ${url} skipped (non-prod host)`, undefined, false);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const data = await attemptJson<T>(url);
      staleCache.set(url, { data, at: Date.now() });
      return data;
    } catch (err) {
      lastError = err;
      const retryable = err instanceof EdgeFetchError ? err.retryable : false;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      const retryAfter = err instanceof EdgeFetchError && err.status === 429 ? String(attempt) : null;
      await sleep(backoffDelay(attempt, retryAfter));
    }
  }
  throw lastError instanceof Error ? lastError : new EdgeFetchError(`edge ${url} failed`);
}

/** Fetch the cached list of published blog posts. Throws on failure. */
export async function fetchCachedBlogPosts<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T>("/api/blog/posts");
}

/** Fetch the cached list of events. Throws on failure. */
export async function fetchCachedEvents<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T>("/api/events");
}

/** Fetch the cached list of gallery items. Throws on failure. */
export async function fetchCachedGallery<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T>("/api/gallery");
}

/** Fetch the cached list of projects. Throws on failure. */
export async function fetchCachedProjects<T = unknown>(): Promise<T[]> {
  return fetchJsonOrThrow<T>("/api/projects");
}

export interface FallbackResult<T> {
  data: T[];
  /** Where the data actually came from — useful for logging and UI hints. */
  source: "edge" | "supabase" | "stale" | "empty";
  /** Set when both the edge and Supabase failed. */
  error?: Error;
}

/**
 * Canonical read ladder for public lists:
 *   edge (with retries) → Supabase (direct, already retrying internally)
 *   → last good payload (stale) → empty array.
 *
 * Never throws: pages render something instead of an error boundary.
 */
export async function fetchWithFallback<T>(
  edgeUrl: string,
  supabaseQuery: () => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<FallbackResult<T>> {
  try {
    const data = await fetchJsonOrThrow<T>(edgeUrl);
    return { data, source: "edge" };
  } catch (edgeErr) {
    if (edgeAvailable()) {
      console.warn(`[edgeApi] ${edgeUrl} unavailable, falling back to database`, edgeErr);
    }
    try {
      const { data, error } = await supabaseQuery();
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      staleCache.set(edgeUrl, { data: rows, at: Date.now() });
      return { data: rows, source: "supabase" };
    } catch (dbErr) {
      const stale = readStale<T>(edgeUrl);
      if (stale) {
        console.warn(`[edgeApi] serving stale cache for ${edgeUrl}`, dbErr);
        return { data: stale, source: "stale", error: dbErr instanceof Error ? dbErr : undefined };
      }
      console.error(`[edgeApi] ${edgeUrl} failed at every layer`, dbErr);
      return {
        data: [],
        source: "empty",
        error: dbErr instanceof Error ? dbErr : new Error(String(dbErr)),
      };
    }
  }
}

/**
 * Bust an edge cache after an admin write. Requires a valid Supabase
 * admin/editor session — sends the access token as Bearer auth.
 *
 * Retries transient failures so a flaky network can't leave stale public
 * content behind; failures are logged and swallowed so a cache-bust failure
 * never breaks the write that just succeeded.
 */
export async function invalidateEdgeCache(
  key: "blog_posts" | "events" | "cached_schedule" | "gallery" | "projects"
): Promise<void> {
  const url = `/api/cache/invalidate/${key}`;
  staleCache.delete(
    key === "cached_schedule" ? "/api/schedule" : `/api/${key === "blog_posts" ? "blog/posts" : key}`,
  );
  if (!edgeAvailable()) return;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return; // not signed in as admin — nothing to invalidate as us

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetchWithTimeout(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) return;
        if (!isRetryableStatus(res.status) || attempt === MAX_ATTEMPTS) {
          console.warn(`[edgeApi] invalidate ${key} returned ${res.status}`);
          return;
        }
        await sleep(backoffDelay(attempt, res.headers.get("retry-after")));
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          console.warn(`[edgeApi] invalidate ${key} failed`, err);
          return;
        }
        await sleep(backoffDelay(attempt));
      }
    }
  } catch (err) {
    console.warn(`[edgeApi] invalidate ${key} failed`, err);
  }
}

// Map of Supabase table names to the edge-cache keys that may have been
// populated from them. Call this after any admin write so the next public
// read goes straight to Supabase instead of serving stale D1/CF-cached data.
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
