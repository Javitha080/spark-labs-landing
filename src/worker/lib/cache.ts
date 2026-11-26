import type { Context } from "hono";
import type { ExecutionContext } from "@cloudflare/workers-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getJsonCache,
  setJsonCache,
  getStaleJsonCache,
  invalidateJsonCache,
} from "../cache/edge-cache";
import {
  BLOG_POSTS_CACHE_KEY,
  MAX_D1_PAYLOAD_CHARS,
  PUBLIC_CACHE_TTL_SECONDS,
  RSS_FEED_CACHE_KEY_FEED,
  RSS_FEED_CACHE_KEY_RSS,
  type AppEnv,
} from "./types";
import { getPublicSupabase } from "./supabase";
import { safeWaitUntil, sanitizeError } from "./http";

export async function cacheResponse(
  request: Request,
  response: Response,
  maxAge: number = 300
): Promise<void> {
  try {
    const cache = (caches as unknown as { default: Cache }).default;
    const clonedResponse = response.clone();
    const cacheableResponse = new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers: {
        ...Object.fromEntries(clonedResponse.headers.entries()),
        "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
      },
    });
    await cache.put(request, cacheableResponse);
  } catch {
    // Cache write failed - don't block the response
  }
}

export async function getCachedResponse(request: Request): Promise<Response | null> {
  try {
    const cache = (caches as unknown as { default: Cache }).default;
    const cached = await cache.match(request);
    if (!cached) return null;
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: new Headers(cached.headers),
    });
  } catch {
    return null;
  }
}

export async function purgePublicCache(c: Context<AppEnv>, cacheKey: string, publicPath: string) {
  if (c.env.CACHE_DB) {
    await invalidateJsonCache(c.env.CACHE_DB, cacheKey);
    if (cacheKey === BLOG_POSTS_CACHE_KEY) {
      await invalidateJsonCache(c.env.CACHE_DB, RSS_FEED_CACHE_KEY_RSS);
      await invalidateJsonCache(c.env.CACHE_DB, RSS_FEED_CACHE_KEY_FEED);
    }
  }
  try {
    const cache = (caches as unknown as { default: Cache }).default;
    await cache.delete(new Request(new URL(publicPath, c.req.url).toString()));
    if (cacheKey === BLOG_POSTS_CACHE_KEY) {
      await cache.delete(new Request(new URL("/rss.xml", c.req.url).toString()));
      await cache.delete(new Request(new URL("/feed.xml", c.req.url).toString()));
    }
  } catch {
    // Cache API unavailable (e.g. local dev) - D1 invalidation above is enough
  }
}

export async function serveCachedList(
  c: Context<AppEnv>,
  cacheKey: string,
  fetchFromSupabase: (sb: SupabaseClient) => Promise<{ data: unknown[] | null; error: unknown }>
) {
  try {
    if (c.env.CACHE_DB) {
      const cached = await getJsonCache<unknown[]>(c.env.CACHE_DB, cacheKey);
      if (cached != null) {
        c.header("Cache-Control", `public, max-age=${PUBLIC_CACHE_TTL_SECONDS}, s-maxage=${PUBLIC_CACHE_TTL_SECONDS}`);
        c.header("X-Cache", "HIT");
        c.header("X-Cache-Source", "D1");
        return c.json(cached);
      }
    }

    const cfCached = await getCachedResponse(c.req.raw);
    if (cfCached) {
      cfCached.headers.set("X-Cache", "HIT");
      cfCached.headers.set("X-Cache-Source", "CF");
      return cfCached;
    }

    const supabase = getPublicSupabase(c.env);

    let data: unknown[] | null = null;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await fetchFromSupabase(supabase);
      if (!result.error) {
        data = result.data;
        lastError = null;
        break;
      }
      lastError = result.error;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 120 * attempt));
    }
    if (lastError) throw lastError;

    const payload = data || [];

    if (c.env.CACHE_DB && JSON.stringify(payload).length < MAX_D1_PAYLOAD_CHARS) {
      await safeWaitUntil(c, setJsonCache(c.env.CACHE_DB, cacheKey, payload, PUBLIC_CACHE_TTL_SECONDS));
    }

    c.header("X-Cache", "MISS");
    c.header("X-Cache-Source", "Supabase");
    c.header("Cache-Control", `public, max-age=${PUBLIC_CACHE_TTL_SECONDS}, s-maxage=${PUBLIC_CACHE_TTL_SECONDS}`);
    const response = c.json(payload);

    await safeWaitUntil(c, cacheResponse(c.req.raw, response, PUBLIC_CACHE_TTL_SECONDS));

    return response;
  } catch (error: unknown) {
    if (c.env.CACHE_DB) {
      const stale = await getStaleJsonCache<unknown[]>(c.env.CACHE_DB, cacheKey);
      if (stale) {
        console.error(
          JSON.stringify({
            level: "error",
            message: `[edge-cache] origin failed for ${cacheKey}, serving stale`,
            ageSeconds: stale.ageSeconds,
            error: error instanceof Error ? error.message : String(error),
          })
        );
        c.header("X-Cache", "STALE");
        c.header("X-Cache-Source", "D1");
        c.header("X-Cache-Age", String(stale.ageSeconds));
        c.header("Cache-Control", "public, max-age=30, s-maxage=30");
        return c.json(stale.data);
      }
    }
    return c.json({ error: sanitizeError(error) }, 503);
  }
}
