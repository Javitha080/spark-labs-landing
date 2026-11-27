import type { Context, Next } from "hono";
import { checkWindowedRateLimit } from "../cache/kv";
import type { AppEnv, Env } from "./types";
import { getClientIP } from "./http";

interface RateLimitEntry {
  timestamps: number[];
}

const DEFAULT_MAX_ENTRIES = 10_000;

export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly maxEntries: number;
  private lastCleanup: number;

  constructor(maxRequests: number, windowMs: number, maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxEntries = Math.max(1, maxEntries);
    this.lastCleanup = Date.now();
  }

  get size(): number {
    return this.store.size;
  }

  check(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();

    if (now - this.lastCleanup > 120_000) {
      this.cleanup();
      this.lastCleanup = now;
    }
    let entry = this.store.get(key);

    if (!entry) {
      if (this.store.size >= this.maxEntries) {
        this.cleanup();
        this.lastCleanup = now;
      }
      while (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey === undefined) break;
        this.store.delete(oldestKey);
      }
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldest = entry.timestamps[0];
      return { allowed: false, remaining: 0, resetMs: oldest + this.windowMs - now };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: this.maxRequests - entry.timestamps.length, resetMs: this.windowMs };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs);
      if (entry.timestamps.length === 0) this.store.delete(key);
    }
  }
}

export const publicApiLimiter = new InMemoryRateLimiter(30, 60_000);
export const authApiLimiter = new InMemoryRateLimiter(60, 60_000);
export const contactLimiter = new InMemoryRateLimiter(5, 300_000);
export const newsletterLimiter = new InMemoryRateLimiter(3, 3_600_000);
export const enrollLimiter = new InMemoryRateLimiter(5, 300_000);
export const enrollEmailLimiter = new InMemoryRateLimiter(3, 3_600_000);
export const uploadLimiter = new InMemoryRateLimiter(10, 300_000);
export const telemetryLimiter = new InMemoryRateLimiter(30, 60_000);

export async function checkRateLimitKV(
  env: Env,
  key: string,
  maxRequests: number,
  windowMs: number,
  fallbackLimiter: InMemoryRateLimiter
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  if (!env.RATE_LIMIT_KV) {
    return fallbackLimiter.check(key);
  }

  try {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const result = await checkWindowedRateLimit(
      env.RATE_LIMIT_KV,
      `rl:${key}`,
      maxRequests,
      windowSeconds
    );
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetMs: Math.max(0, result.resetAt - Date.now()),
    };
  } catch {
    console.warn(JSON.stringify({ level: "warn", message: "[rate-limit] KV unavailable, falling back to in-memory" }));
    return fallbackLimiter.check(key);
  }
}

export const getRateLimiter = (path: string, method: string): InMemoryRateLimiter => {
  const isWrite = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (isWrite && path.includes("/newsletter")) {
    return newsletterLimiter;
  }
  if (isWrite && path.includes("/enroll")) {
    return enrollLimiter;
  }
  if (isWrite && (path.includes("/telemetry") || path.includes("/csp-report"))) {
    return telemetryLimiter;
  }
  if (isWrite && (path.includes("/send-") || path.includes("/verify-turnstile"))) {
    return contactLimiter;
  }
  if (isWrite || path.includes("/activit") || path.includes("/cache/")) {
    return authApiLimiter;
  }
  return publicApiLimiter;
};

export const rateLimitMiddleware = async (c: Context<AppEnv>, next: Next) => {
  if (c.req.method === "OPTIONS") return next();

  const clientIP = getClientIP(c);
  const path = new URL(c.req.url).pathname;

  if (c.env.NATIVE_RATE_LIMITER) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { success } = await (c.env.NATIVE_RATE_LIMITER as any).limit({ key: clientIP });
      if (!success) {
        c.header("Retry-After", "60");
        return c.json({ error: "Too many requests. Please try again later." }, 429);
      }
    } catch (err) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[rate-limit] native limiter failed",
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  } else {
    const limiter = getRateLimiter(path, c.req.method);
    const bucket = path.split("/").slice(0, 4).join("/");
    const result = await checkRateLimitKV(
      c.env,
      `${clientIP}:${c.req.method === "GET" ? "r" : "w"}:${bucket}`,
      limiter.maxRequests,
      limiter.windowMs,
      limiter
    );

    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(result.resetMs / 1000)));

    if (!result.allowed) {
      c.header("Retry-After", String(Math.max(1, Math.ceil(result.resetMs / 1000))));
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }
  }

  await next();
};
