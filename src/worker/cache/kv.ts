/**
 * KV binding utilities.
 *
 * Thin wrappers over `KVNamespace` that enforce Workers best practices:
 *  - JSON values are read with `{ type: "json" }` so the runtime parses them
 *    and `get<T>()` returns the typed value (no manual JSON.parse, no try/catch).
 *  - `expirationTtl` is clamped to KV's 60 s minimum — anything below 60 throws.
 *  - `getWithMetadata` is used so a value and its bookkeeping (window boundary,
 *    schema version, etc.) are read in a single round-trip.
 *  - All writes and reads log a structured `[kv]` line on failure but never
 *    throw — KV outages must not crash the request path.
 *
 * Atomicity note: KV is eventually consistent across regions. A `get` + `put`
 * pair has a small race window. For strict atomicity, use D1 or a Durable
 * Object. The helpers below are best-effort — appropriate for the rate-limit
 * fallback and for non-critical caches.
 */

import type { KVNamespace } from "@cloudflare/workers-types";

const MIN_TTL_SECONDS = 60;

const logKvError = (op: string, key: string, err: unknown) => {
  console.error(
    JSON.stringify({
      message: "kv operation failed",
      op,
      key,
      error: err instanceof Error ? err.message : String(err),
    })
  );
};

/** Read a JSON value, or `null` on miss / parse error / KV failure. */
export async function getJson<T>(
  kv: KVNamespace,
  key: string
): Promise<T | null> {
  try {
    const value = await kv.get<T>(key, { type: "json" });
    return value ?? null;
  } catch (err) {
    logKvError("getJson", key, err);
    return null;
  }
}

/** Write a JSON value with an expiration in seconds (clamped to 60 s minimum). */
export async function putJson<T>(
  kv: KVNamespace,
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const safeTtl = Math.max(MIN_TTL_SECONDS, Math.ceil(ttlSeconds));
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: safeTtl });
  } catch (err) {
    logKvError("putJson", key, err);
  }
}

/** Read a JSON value together with its metadata in a single round-trip. */
export async function getJsonWithMetadata<T, M = Record<string, unknown>>(
  kv: KVNamespace,
  key: string
): Promise<{ value: T | null; metadata: M | null }> {
  try {
    const { value, metadata } = await kv.getWithMetadata(key, { type: "json" });
    return {
      value: (value as T | null) ?? null,
      metadata: (metadata as M | null) ?? null,
    };
  } catch (err) {
    logKvError("getJsonWithMetadata", key, err);
    return { value: null, metadata: null };
  }
}

/** Read a raw string value, or `null` on miss / KV failure. */
export async function getString(
  kv: KVNamespace,
  key: string
): Promise<string | null> {
  try {
    const value = await kv.get(key);
    return value ?? null;
  } catch (err) {
    logKvError("getString", key, err);
    return null;
  }
}

/** Write a raw string value with TTL (clamped to 60 s minimum). */
export async function putString(
  kv: KVNamespace,
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  const safeTtl = Math.max(MIN_TTL_SECONDS, Math.ceil(ttlSeconds));
  try {
    await kv.put(key, value, { expirationTtl: safeTtl });
  } catch (err) {
    logKvError("putString", key, err);
  }
}

/** Delete a key. No-op on miss. */
export async function del(kv: KVNamespace, key: string): Promise<void> {
  try {
    await kv.delete(key);
  } catch (err) {
    logKvError("del", key, err);
  }
}

/** List keys under a prefix, paginating automatically until `list_complete`. */
export async function listKeys(
  kv: KVNamespace,
  prefix?: string,
  limit = 1000
): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    try {
      const page = await kv.list({
        ...(prefix ? { prefix } : {}),
        limit,
        ...(cursor ? { cursor } : {}),
      });
      for (const k of page.keys) out.push(k.name);
      cursor = page.list_complete ? undefined : (page as any).cursor;
    } catch (err) {
      logKvError("listKeys", prefix ?? "<all>", err);
      return out;
    }
  } while (cursor);
  return out;
}

/**
 * Fixed-window rate-limit counter.
 *
 * Reads the current window's count + the window boundary in one round-trip via
 * `getWithMetadata`, decides whether to allow, then writes the new count with
 * the new boundary. The window key auto-expires one window after creation so
 * KV is not asked to remember a fixed-window key indefinitely.
 *
 * Race window: two concurrent requests in the same window can both read the
 * same count and both write `count + 1`. For a strict-atomic implementation,
 * use a Durable Object. The current rate-limiter is only a fallback for when
 * the native rate-limit binding is absent, so a small race is acceptable.
 */
export interface WindowedRateResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  count: number;
}

export async function checkWindowedRateLimit(
  kv: KVNamespace,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<WindowedRateResult> {
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  const windowStart = nowSec - (nowSec % windowSeconds);
  const resetAt = (windowStart + windowSeconds) * 1000;
  const windowKey = `${key}:${windowStart}`;

  const { value } = await getJsonWithMetadata<{ count: number }>(
    kv,
    windowKey
  );
  const count = value?.count ?? 0;

  if (count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt, count };
  }

  const nextCount = count + 1;
  await putJson(
    kv,
    windowKey,
    { count: nextCount, windowStart },
    windowSeconds + 10
  );

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - nextCount),
    resetAt,
    count: nextCount,
  };
}
