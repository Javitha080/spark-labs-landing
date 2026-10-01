import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { compress } from "hono/compress";
import { createClient, type User } from "@supabase/supabase-js";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { isBot, injectPrerenderContent } from "./prerender";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  getJsonCache,
  setJsonCache,
  getStaleJsonCache,
  invalidateJsonCache,
} from "./cache/edge-cache";
import { checkWindowedRateLimit } from "./cache/kv";
import { processEmailQueue, deliverEmail, type EmailMessage } from "./queues/email-consumer";
import { analyticsMiddleware } from "./middleware/analytics";
import type {
  ExecutionContext,
  MessageBatch,
  KVNamespace,
  D1Database,
  Queue,
} from "@cloudflare/workers-types";

// ─── Constants ──────────────────────────────────────────────────────────────

// BUILD_VERSION is the semver of the deployed Worker bundle. Bump it on
// intentional deploys so the /api/build-version endpoint reflects the current
// build. The Worker is compiled by Wrangler (not Vite), so we don't get
// build-time define injection — we hardcode the version here.
//
// BUILD_TIMESTAMP is set at module load (= isolate warm-up). It roughly
// corresponds to the deploy time and is good enough for cache-bust diagnostics.
const BUILD_VERSION = "0.2.0";
const BUILD_TIMESTAMP = String(Date.now());
const APP_NAME = "Spark Labs HQ – YICDVP";



// Consolidated Content Security Policy (single source of truth)
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.instagram.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://www.googletagmanager.com https://www.instagram.com https://*.cdninstagram.com https://img.youtube.com https://*.ytimg.com https://ibb.co https://*.ibb.co https://upload.wikimedia.org https://*.unsplash.com https://images.unsplash.com https://source.unsplash.com",
  "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app https://*.cloudflareinsights.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.ipify.org https://api64.ipify.org https://noembed.com https://api.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com https://api.lettermint.co",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com",
  "child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "media-src 'self' blob: https://*.supabase.co https://*.supabase.in https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  details?: Record<string, unknown>;
  created_at: string;
}

type Env = {
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  LETTERMINT_API_KEY?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  RATE_LIMIT_KV?: KVNamespace;
  CACHE_DB?: D1Database;
  EMAIL_QUEUE?: Queue<EmailMessage>;
  ANALYTICS?: unknown; // AnalyticsEngineDataset
  NATIVE_RATE_LIMITER?: unknown;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip every HTML tag from user text but keep the characters the user typed.
 *
 * `sanitizeHtml()` alone returns HTML-ENCODED text ("R&D" -> "R&amp;D"), which
 * was then stored in Supabase and rendered by React as the literal "R&amp;D".
 * We strip tags with sanitize-html and decode the five entities it produces so
 * data stays plain text. Output encoding is the job of the renderer / email
 * templates (see escapeHtml below), not of the storage layer.
 */
const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};
const stripHtml = (value: string): string =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITY_MAP[m] ?? m)
    // remove control chars (keep \n, \r, \t) – blocks header/CRLF injection payloads
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

/** Escape text for safe interpolation into an HTML email/template. */
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));

/** Single-line version for e-mail subjects / names (prevents CRLF header injection). */
const singleLine = (value: string, max = 120): string =>
  value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const isValidEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sanitizeObject = (obj: unknown): unknown => {
  if (typeof obj === "string") return stripHtml(obj);
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Never let a payload poison the prototype chain
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * Parse a JSON request body. Malformed JSON used to throw into the route's
 * catch block and surface as a misleading 500; now it is a clean 400.
 */
class HttpError extends Error {
  constructor(readonly status: ContentfulStatusCode, message: string) {
    super(message);
  }
}
async function readJsonObject(c: Context): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await c.req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

// Sanitize errors to prevent leaking DB internals/stack details to clients
const sanitizeError = (error: unknown): string => {
  console.error(JSON.stringify({ level: "error", message: "[INTERNAL ERROR]", error: error instanceof Error ? error.message : String(error) }));
  return "An internal error occurred. Please try again later.";
};

// ─── Rate Limiter (KV-backed with in-memory fallback) ───────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  readonly maxRequests: number;
  readonly windowMs: number;
  private lastCleanup: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.lastCleanup = Date.now();
  }

  check(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();

    if (now - this.lastCleanup > 120_000) {
      this.cleanup();
      this.lastCleanup = now;
    }
    let entry = this.store.get(key);

    if (!entry) {
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

// In-memory fallback limiters
const publicApiLimiter = new InMemoryRateLimiter(30, 60_000);
const authApiLimiter = new InMemoryRateLimiter(60, 60_000);
const contactLimiter = new InMemoryRateLimiter(5, 300_000);
const uploadLimiter = new InMemoryRateLimiter(10, 300_000);

/**
 * KV-backed rate limiter with in-memory fallback.
 * Uses a fixed-window counter stored in KV as JSON via cache/kv.ts.
 * Returns milliseconds-based `resetMs` for backward compatibility with
 * callers that set `Retry-After` headers.
 */
async function checkRateLimitKV(
  env: Env,
  key: string,
  maxRequests: number,
  windowMs: number,
  fallbackLimiter: InMemoryRateLimiter
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  // If KV is not available, fall back to in-memory
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
    // KV failed — fall back to in-memory
    console.warn(JSON.stringify({ level: "warn", message: "[rate-limit] KV unavailable, falling back to in-memory" }));
    return fallbackLimiter.check(key);
  }
}

/**
 * Check if a user has CMS access roles.
 * Checks both user_roles and users_management+roles tables.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hasCmsAccess(supabase: any, userId: string, allowedRoles: string[]): Promise<boolean> {
  const { data: roleData } = await supabase
    .from("user_roles").select("role").eq("user_id", userId);
  if (Array.isArray(roleData) && roleData.some((r: { role: string }) => allowedRoles.includes(r.role))) {
    return true;
  }

  const { data: mgmtData } = await supabase
    .from("users_management").select("role_id").eq("user_id", userId).maybeSingle();
  if (mgmtData?.role_id) {
    const { data: extRole } = await supabase
      .from("roles").select("name").eq("id", mgmtData.role_id).maybeSingle();
    if (extRole?.name && allowedRoles.includes(extRole.name)) return true;
  }

  return false;
}

// Every Supabase REST call gets a hard deadline. Without one a stalled origin
// kept the request (and the 3-attempt retry loop in serveCachedList) hanging for
// as long as the platform allowed – measured at >20 s before the visitor saw an error.
const SUPABASE_FETCH_TIMEOUT_MS = 5000;
const fetchWithDeadline: typeof fetch = (input, init) => {
  const deadline = AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  return fetch(input, { ...init, signal });
};

const resolveSupabaseUrl = (env: Env) => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };
  return (
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ||
    meta.env?.VITE_SUPABASE_URL ||
    ""
  );
};

/**
 * Read-only client for PUBLIC endpoints (blog posts, events, schedule, gallery).
 * Uses the publishable key only, so public pages keep serving data even when the
 * service role key is missing/rotated. RLS still applies — no privilege bypass.
 */
const getPublicSupabase = (env: Env) => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };
  const url = resolveSupabaseUrl(env);
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) {
    throw new Error(
      "Publishable Supabase key is missing. Refusing to escalate public reads to service_role."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithDeadline },
  });
};

const getSupabase = (env: Env) => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };


  const supabaseUrl =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ||
    meta.env?.VITE_SUPABASE_URL ||
    "";

  let supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const isPlaceholder = supabaseKey === "YOUR_SERVICE_ROLE_KEY_HERE";

  // Safety check: detect JWT keys that belong to a different project
  if (supabaseKey && !isPlaceholder && supabaseKey.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(supabaseKey.split('.')[1]));
      const expectedRef = env.VITE_SUPABASE_PROJECT_ID;
      if (expectedRef && payload.ref && payload.ref !== expectedRef) {
        console.warn(JSON.stringify({ level: "warn", message: `[supabase] SUPABASE_SERVICE_ROLE_KEY belongs to project "${payload.ref}" but expected "${expectedRef}". Discarding mismatched key.` }));
        supabaseKey = undefined;
      }
    } catch {
      // Not a valid JWT — might be new key format, let it through
    }
  }

  if (!supabaseKey || isPlaceholder) {
    // In production, NEVER fall back to the publishable key — admin
    // operations require the service role key to bypass RLS. Silently
    // downgrading would cause hard-to-debug permission failures.
    const isProduction = (env.NODE_ENV || "production") === "production";
    if (isProduction) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing or set to a placeholder. " +
        "The Worker cannot start in production without a valid service role key. " +
        "Set it via `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`."
      );
    }

    // In development/preview, fall back to the publishable key with a warning
    const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    if (publishableKey) {
      console.warn(JSON.stringify({ level: "warn", message: `[supabase] Warning: Using publishable key fallback because SUPABASE_SERVICE_ROLE_KEY is ${isPlaceholder ? "a placeholder" : "missing or mismatched"}. Admin actions will not be available.` }));
      supabaseKey = publishableKey;
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and a Supabase key must be set in Cloudflare environment variables."
    );
  }

  // Inject a custom fetch to measure Supabase REST latency and track analytics.
  // Failures propagate as real errors — no silent fallback to a different DB.
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const start = Date.now();
        const response = await fetchWithDeadline(input, init);

        const duration = Date.now() - start;

        if (env.ANALYTICS) {
          // Telemetry must never break the request it is measuring
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (env.ANALYTICS as any).writeDataPoint({
              blobs: ["supabase_api", "FETCH", response.status.toString()],
              doubles: [duration],
            });
          } catch { /* ignore */ }
        }

        return response;
      },
    },
  });
};

/**
 * Verify Turnstile token server-side.
 */
async function verifyTurnstile(
  token: string | null | undefined,
  env: Env,
  remoteIp?: string
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // Only bypass outside production. (The previous check also bypassed when the
    // service-role key was a placeholder, which let a misconfigured production
    // deploy silently disable bot protection.)
    if ((env.NODE_ENV || "production") !== "production") {
      console.warn(JSON.stringify({ level: "warn", message: "[turnstile] Secret key not configured in development. Bypassing Turnstile verification." }));
      return true;
    }
    return false;
  }
  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteIp && remoteIp !== "unknown" ? { remoteip: remoteIp } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return false;
    const data = await response.json() as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error(JSON.stringify({ level: "error", message: "[turnstile] verification failed", error: err instanceof Error ? err.message : String(err) }));
    return false;
  }
}

/**
 * Cloudflare Cache API helper for public endpoints.
 */
async function cacheResponse(
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
    // Cache write failed — don't block the response
  }
}

async function getCachedResponse(request: Request): Promise<Response | null> {
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

// ─── App ────────────────────────────────────────────────────────────────────

import { AppRole, CMS_ACCESS_ROLES, ROLE_PERMISSIONS } from "../lib/rbac";

const app = new Hono<{ Bindings: Env; Variables: { user: User; role: AppRole } }>();

// ─── Analytics Engine Middleware ─────
app.use("*", analyticsMiddleware);

// ─── HTTPS + Canonical-Host Redirect (must be first) ────────────────────────

const CANONICAL_HOST = "dvpyic.dpdns.org";

app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const host = url.hostname;

  const isPreviewEnv =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".pages.dev") ||
    host.endsWith(".workers.dev");

  if (!isPreviewEnv) {
    if (url.protocol === "http:") {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      return c.redirect(url.toString(), 301);
    }
    if (host !== CANONICAL_HOST) {
      url.hostname = CANONICAL_HOST;
      return c.redirect(url.toString(), 301);
    }
  }

  await next();
});

// ─── Free Performance Middlewares ──────────────────────────────────────────
app.use("/api/*", etag());
app.use("/api/*", compress());

// ─── Global CORS ────────────────────────────────────────────────────────────

const PROD_ORIGINS = ["https://dvpyic.dpdns.org", "https://www.dvpyic.dpdns.org"];
const isAllowedOrigin = (origin: string): boolean => {
  if (PROD_ORIGINS.includes(origin)) return true;
  // The project's own Cloudflare Pages deployments only – NOT every *.pages.dev
  // site (with credentials:true any attacker-hosted pages.dev origin was trusted).
  if (/^https:\/\/([a-z0-9-]+\.)?yicdvp\.pages\.dev$/.test(origin)) return true;
  // Local development
  return /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+$/.test(origin);
};

app.use(
  "/api/*",
  cors({
    // Unknown origins get the prod origin back, which never matches theirs, so
    // the browser blocks the response. Known origins are echoed exactly.
    origin: (origin) => (origin && isAllowedOrigin(origin) ? origin : PROD_ORIGINS[0]),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Turnstile-Token", "X-Correlation-Id"],
    exposeHeaders: ["X-Request-Id", "Retry-After", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 86400,
    credentials: true,
  })
);

// ─── Rate Limiting Middleware ───────────────────────────────────────────────

/**
 * Pick the limiter for a request. The old version matched on `path.includes()`
 * only, so the PUBLIC `GET /api/schedule` was throttled by the contact-form
 * limiter (5 requests / 5 min) and the admin Schedule screen got 429s after a
 * handful of refreshes. Write-ish endpoints are now selected by method too.
 */
const getRateLimiter = (path: string, method: string) => {
  const isWrite = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (isWrite && (path.includes("/send-") || path.includes("/newsletter") || path.includes("/verify-turnstile"))) {
    return contactLimiter;
  }
  if (isWrite || path.startsWith("/api/admin") || path.includes("/activit") || path.includes("/cache/")) {
    return authApiLimiter;
  }
  return publicApiLimiter;
};

const getClientIP = (c: Context): string =>
  c.req.header("CF-Connecting-IP") ||
  c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
  "unknown";

app.use("/api/*", async (c, next) => {
  // CORS preflights must never consume the rate-limit budget
  if (c.req.method === "OPTIONS") return next();

  const clientIP = getClientIP(c);
  const path = new URL(c.req.url).pathname;

  // Native Rate Limiting binding (zero-latency) if configured
  if (c.env.NATIVE_RATE_LIMITER) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { success } = await (c.env.NATIVE_RATE_LIMITER as any).limit({ key: clientIP });
      if (!success) {
        c.header("Retry-After", "60");
        return c.json({ error: "Too many requests. Please try again later." }, 429);
      }
    } catch (err) {
      // A broken limiter binding must not take the whole API down
      console.warn(JSON.stringify({ level: "warn", message: "[rate-limit] native limiter failed", error: err instanceof Error ? err.message : String(err) }));
    }
  } else {
    const limiter = getRateLimiter(path, c.req.method);
    // Bucket by limiter + first 3 path segments so dynamic ids / slugs
    // (/api/schedule/<uuid>) can't create unbounded KV keys.
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
});

// ─── Security Headers Middleware (API routes) ───────────────────────────────

app.use("/api/*", async (c, next) => {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), xr-spatial-tracking=()"
  );
  c.header(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  c.header("Content-Security-Policy", CSP_POLICY);

  c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  c.header("Cross-Origin-Resource-Policy", "cross-origin");

  if (!c.res.headers.has("Cache-Control")) {
    c.header(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    c.header("Pragma", "no-cache");
  }

  c.header("X-Request-Id", crypto.randomUUID());
});

// ─── Auth Middleware ────────────────────────────────────────────────────────

// Highest privilege first. A user may hold several rows in user_roles
// (UNIQUE is on (user_id, role)); `.maybeSingle()` errors on >1 row, which
// previously locked multi-role users out of the CMS with a 403.
const ROLE_PRIORITY: AppRole[] = ["admin", "editor", "coordinator", "content_creator"];

const pickHighestRole = (names: string[]): AppRole => {
  for (const role of ROLE_PRIORITY) {
    if (names.includes(role as string)) return role;
  }
  return null;
};

const authMiddleware = async (
  c: Context<{ Bindings: Env; Variables: { user: User; role: AppRole } }>,
  next: Next
) => {
  const authHeader = c.req.header("Authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!match) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }
  const token = match[1];

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase(c.env);
  } catch (err) {
    // Misconfiguration (e.g. missing service key) is a server problem, not a 401
    console.error(JSON.stringify({ level: "error", message: "[authMiddleware] Supabase client unavailable", error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }
    user = data.user;
  } catch (err) {
    console.error(JSON.stringify({ level: "error", message: "[authMiddleware] getUser failed", error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }

  let resolvedRole: AppRole = null;

  try {
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (roleErr) throw roleErr;

    resolvedRole = pickHighestRole((roleRows ?? []).map((r: { role: string }) => r.role));

    if (!resolvedRole) {
      const { data: mgmtData, error: mgmtErr } = await supabase
        .from("users_management")
        .select("role_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (mgmtErr) throw mgmtErr;

      if (mgmtData?.role_id) {
        const { data: extRoleData, error: extErr } = await supabase
          .from("roles")
          .select("name")
          .eq("id", mgmtData.role_id)
          .maybeSingle();
        if (extErr) throw extErr;

        if (extRoleData?.name && CMS_ACCESS_ROLES.includes(extRoleData.name as AppRole)) {
          resolvedRole = extRoleData.name as AppRole;
        }
      }
    }
  } catch (err) {
    console.error(JSON.stringify({ level: "error", message: `[authMiddleware] Role verification failed for user ${user.id}`, error: err instanceof Error ? err.message : String(err) }));
    // 503 (retryable) rather than 500 so clients/retry logic treat it as transient
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }

  if (!resolvedRole) {
    return c.json({ error: "Forbidden: CMS access required" }, 403);
  }

  c.set("user", user);
  c.set("role", resolvedRole);
  await next();
};

const requirePermission = (permission: string) => {
  return async (c: Context<{ Bindings: Env; Variables: { user: User; role: AppRole } }>, next: Next) => {
    const role = c.get("role");
    if (!role) {
      return c.json({ error: "Forbidden: No role assigned" }, 403);
    }
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    if (!permissions.includes("all") && !permissions.includes(permission)) {
      return c.json({ error: `Forbidden: Requires '${permission}' permission` }, 403);
    }
    await next();
  };
};

// ─── Health & Info Endpoints (with Cloudflare Cache API) ────────────────────

app.get("/api/health", async (c) => {
  // Liveness must never be served from cache – a cached "healthy" hides outages.
  c.header("Cache-Control", "no-store");
  const body: Record<string, unknown> = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: BUILD_VERSION,
    environment: c.env.NODE_ENV || "production",
    uptime: "edge",
  };

  // /api/health?deep=1 also pings Supabase so ops can tell "worker up" from "database reachable"
  if (c.req.query("deep") === "1") {
    try {
      const url = resolveSupabaseUrl(c.env);
      const key = c.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      if (!url || !key) throw new Error("Supabase env not configured");
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(4000),
      });
      body.supabase = res.ok ? "ok" : `http_${res.status}`;
      if (!res.ok) body.status = "degraded";
    } catch (err) {
      body.supabase = "unreachable";
      body.status = "degraded";
      console.error(JSON.stringify({ level: "error", message: "[health] supabase check failed", error: err instanceof Error ? err.message : String(err) }));
    }
  }

  return c.json(body, body.status === "healthy" ? 200 : 503);
});

app.get("/api/info", async (c) => {
  const cached = await getCachedResponse(c.req.raw);
  if (cached) {
    c.header("X-Cache", "HIT");
    return cached;
  }

  const response = c.json({
    name: APP_NAME,
    version: BUILD_VERSION,
    platform: "Cloudflare Workers",
    features: [
      "Edge-deployed API",
      "Supabase integration",
      "Static asset serving",
      "Security headers",
      "CORS support",
      "KV rate limiting",
      "D1 edge caching",
      "Analytics Engine",
      "Queue processing",
      "Turnstile protection",
    ],
  });

  c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
  await cacheResponse(c.req.raw, response, 3600);
  c.header("X-Cache", "MISS");
  return response;
});

// ─── Build Version Endpoint ─────────────────────────────────────────────────
// Public, no cache. The service worker hits this on install to detect when it
// is out of date. No PII / no auth — safe to expose.
app.get("/api/build-version", async (c) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate");
  c.header("Pragma", "no-cache");
  return c.json({
    version: BUILD_VERSION,
    buildTimestamp: BUILD_TIMESTAMP,
    deployedAt: new Date().toISOString(),
  });
});

// ─── Cache Keys & Config ────────────────────────────────────────────────────
// Public list of published posts. Cached as a JSON blob in D1 so the schema
// stays decoupled from the Supabase columns the frontend uses.

const BLOG_POSTS_CACHE_KEY = "blog_posts:published:list";
const EVENTS_CACHE_KEY = "events:all:list";
const SCHEDULE_CACHE_KEY = "schedule:all:list";
const GALLERY_CACHE_KEY = "gallery:all:list";
const PROJECTS_CACHE_KEY = "projects:all:list";
// 60s TTL on the public cache — short enough that admin writes are visible
// quickly even when the invalidate-on-write path is bypassed, long enough
// to absorb traffic spikes.
const PUBLIC_CACHE_TTL_SECONDS = 60;
const MAX_D1_PAYLOAD_CHARS = 1_500_000;

// ─── Schedule API Routes (with D1 edge caching) ─────────────────────────────

app.get("/api/schedule", (c) =>
  serveCachedList(c, SCHEDULE_CACHE_KEY, async (sb) =>
    await sb
      .from("schedule")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(500),
  ),
);

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

// Allow-list of writable columns. Previously the raw (sanitised) request body
// went straight into .insert()/.update(), so a caller could overwrite `id`,
// `created_at`, or send unknown columns and get an opaque 500.
const scheduleBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: nullableText(2000),
  day_of_week: z.enum(DAYS_OF_WEEK).nullable().optional(),
  start_time: z.string().regex(TIME_RE, "start_time must be HH:MM").nullable().optional(),
  end_time: z.string().regex(TIME_RE, "end_time must be HH:MM").nullable().optional(),
  location: nullableText(200),
  is_active: z.boolean().nullable().optional(),
}).strict();

function parseScheduleBody(raw: unknown, partial: boolean) {
  const schema = partial ? scheduleBodySchema.partial() : scheduleBodySchema;
  // The admin form sends "" for empty <input type="time"> fields; Postgres `time`
  // columns reject "" ("invalid input syntax for type time"), so map to NULL.
  const cleaned = sanitizeObject(raw) as Record<string, unknown>;
  for (const field of ["start_time", "end_time"]) {
    if (cleaned[field] === "") cleaned[field] = null;
  }
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    throw new HttpError(400, message);
  }
  if (partial && Object.keys(result.data).length === 0) {
    throw new HttpError(400, "No updatable fields provided");
  }
  const { start_time, end_time } = result.data;
  if (start_time && end_time && end_time.slice(0, 5) <= start_time.slice(0, 5)) {
    throw new HttpError(400, "end_time must be after start_time");
  }
  return result.data;
}

/** Drop BOTH cache layers for a public GET path so admins see their own writes. */
async function purgePublicCache(c: Context, cacheKey: string, publicPath: string) {
  if (c.env.CACHE_DB) {
    await invalidateJsonCache(c.env.CACHE_DB, cacheKey);
  }
  try {
    const cache = (caches as unknown as { default: Cache }).default;
    await cache.delete(new Request(new URL(publicPath, c.req.url).toString()));
  } catch {
    // Cache API unavailable (e.g. local dev) – D1 invalidation above is enough
  }
}

app.post("/api/schedule", authMiddleware, requirePermission("schedule"), async (c) => {
  try {
    const body = parseScheduleBody(await readJsonObject(c), false);
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from("schedule").insert(body).select().single();
    if (error) throw error;

    await purgePublicCache(c, SCHEDULE_CACHE_KEY, "/api/schedule");
    return c.json({ success: true, data }, 201);
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

app.put("/api/schedule/:id", authMiddleware, requirePermission("schedule"), async (c) => {
  try {
    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid schedule id" }, 400);
    const body = parseScheduleBody(await readJsonObject(c), true);
    const supabase = getSupabase(c.env);
    // .select() + maybeSingle(): an update that matches no row used to report
    // success:true even though nothing changed.
    const { data, error } = await supabase
      .from("schedule")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Schedule item not found" }, 404);

    await purgePublicCache(c, SCHEDULE_CACHE_KEY, "/api/schedule");
    return c.json({ success: true, data });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

app.delete("/api/schedule/:id", authMiddleware, requirePermission("schedule"), async (c) => {
  try {
    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid schedule id" }, 400);
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from("schedule").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) return c.json({ error: "Schedule item not found" }, 404);

    await purgePublicCache(c, SCHEDULE_CACHE_KEY, "/api/schedule");
    return c.json({ success: true });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

/** Convert thrown errors into the right status: HttpError → its status, anything else → sanitised 500. */
function handleRouteError(c: Context, error: unknown) {
  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status);
  }
  return c.json({ error: sanitizeError(error) }, 500);
}

/**
 * Generic edge-cached list handler:
 *   1. D1 JSON cache (cross-isolate, survives evictions, TTL-checked)
 *   2. Cloudflare Cache API (per-colo, very fast)
 *   3. Supabase (origin)
 *
 * Cache writes use `waitUntil` so they don't add latency to the response.
 * An empty result IS cached — `cached != null` rather than `length > 0` —
 * so a legitimately empty table doesn't hammer Supabase on every request.
 */
async function serveCachedList(
  c: Context<{ Bindings: Env; Variables: { user: User; role: AppRole } }>,
  cacheKey: string,
  fetchFromSupabase: (sb: ReturnType<typeof getSupabase>) => Promise<{ data: unknown[] | null; error: unknown }>,
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

    // Retry transient origin failures twice before giving up. Supabase cold
    // starts and brief network blips are common enough that one extra attempt
    // turns most visitor-visible errors into a normal (slightly slower) hit.
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
    const waitUntil = (c.executionCtx as ExecutionContext | undefined)?.waitUntil?.bind(c.executionCtx);

    // D1 rejects rows over ~2 MB. A silent failed write meant every request
    // re-hit Supabase; skip D1 for oversized payloads (CF Cache API still applies).
    if (c.env.CACHE_DB && JSON.stringify(payload).length < MAX_D1_PAYLOAD_CHARS) {
      const write = setJsonCache(c.env.CACHE_DB, cacheKey, payload, PUBLIC_CACHE_TTL_SECONDS);
      if (waitUntil) waitUntil(write); else await write;
    }

    c.header("X-Cache", "MISS");
    c.header("X-Cache-Source", "Supabase");
    c.header("Cache-Control", `public, max-age=${PUBLIC_CACHE_TTL_SECONDS}, s-maxage=${PUBLIC_CACHE_TTL_SECONDS}`);
    const response = c.json(payload);

    const cfWrite = cacheResponse(c.req.raw, response, PUBLIC_CACHE_TTL_SECONDS);
    if (waitUntil) waitUntil(cfWrite); else await cfWrite;

    return response;
  } catch (error: unknown) {
    // Origin is down or erroring: serve the last known good payload past its
    // TTL rather than a 500. Visitors see slightly old content instead of a
    // broken page, and the age is advertised so clients can tell.
    if (c.env.CACHE_DB) {
      const stale = await getStaleJsonCache<unknown[]>(c.env.CACHE_DB, cacheKey);
      if (stale) {
        console.error(JSON.stringify({
          level: "error",
          message: `[edge-cache] origin failed for ${cacheKey}, serving stale`,
          ageSeconds: stale.ageSeconds,
          error: error instanceof Error ? error.message : String(error),
        }));
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

app.get("/api/blog/posts", (c) =>
  serveCachedList(c, BLOG_POSTS_CACHE_KEY, async (sb) =>
    await sb
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(200),
  ),
);

// ─── Events API (D1 JSON cache + CF cache) ──────────────────────────────────

app.get("/api/events", (c) =>
  serveCachedList(c, EVENTS_CACHE_KEY, async (sb) =>
    await sb
      .from("events")
      .select("*")
      .order("event_date", { ascending: false })
      .limit(500),
  ),
);

// ─── Gallery API (D1 JSON cache + CF cache) ────────────────────────────────

app.get("/api/gallery", (c) =>
  serveCachedList(c, GALLERY_CACHE_KEY, async (sb) =>
    await sb
      .from("gallery_items")
      .select("*")
      .order("display_order", { ascending: true })
      .limit(500),
  ),
);

// ─── Projects API (D1 JSON cache + CF cache) ────────────────────────────────

app.get("/api/projects", (c) =>
  serveCachedList(c, PROJECTS_CACHE_KEY, async (sb) =>
    await sb
      .from("projects")
      .select("*")
      .order("display_order", { ascending: true })
      .limit(500),
  ),
);

// ─── Cache Invalidation (admin) ─────────────────────────────────────────────
// Frontend admin pages call this after a Supabase write to bust the edge cache.
// Accepts either a logical cache key ("blog_posts" / "events") or a legacy
// table name ("cached_schedule").
const INVALIDATABLE_KEYS: Record<string, { cacheKey: string; path: string; permission: string }> = {
  blog_posts:      { cacheKey: BLOG_POSTS_CACHE_KEY, path: "/api/blog/posts", permission: "blog" },
  events:          { cacheKey: EVENTS_CACHE_KEY,     path: "/api/events",     permission: "events" },
  cached_schedule: { cacheKey: SCHEDULE_CACHE_KEY,   path: "/api/schedule",   permission: "schedule" },
  gallery:         { cacheKey: GALLERY_CACHE_KEY,    path: "/api/gallery",    permission: "gallery" },
  projects:        { cacheKey: PROJECTS_CACHE_KEY,   path: "/api/projects",   permission: "projects" },
};

// Any CMS user could previously bust ANY cache. Now the caller must hold the
// permission that owns the resource, and both cache layers are purged (the
// per-colo Cache API copy used to keep serving stale data for up to 60 s).
app.post("/api/cache/invalidate/:key", authMiddleware, async (c) => {
  try {
    const key = c.req.param("key") || "";
    const target = Object.prototype.hasOwnProperty.call(INVALIDATABLE_KEYS, key) ? INVALIDATABLE_KEYS[key] : undefined;
    if (!target) {
      return c.json({ error: "Unknown cache key" }, 400);
    }
    const role = c.get("role");
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    if (!permissions.includes("all") && !permissions.includes(target.permission)) {
      return c.json({ error: `Forbidden: Requires '${target.permission}' permission` }, 403);
    }
    await purgePublicCache(c, target.cacheKey, target.path);
    return c.json({ success: true, invalidated: key });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

// ─── Activity Log API Routes ────────────────────────────────────────────────

app.get("/api/activities", authMiddleware, requirePermission("analytics"), async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const dateRange = c.req.query("dateRange") || "7days";

    if (!["today", "7days", "30days", "all"].includes(dateRange)) {
      return c.json({ error: "Invalid dateRange. Use today, 7days, 30days or all." }, 400);
    }

    let fromDate = new Date();
    if (dateRange === "today") {
      fromDate.setUTCHours(0, 0, 0, 0);
    } else if (dateRange === "7days") {
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (dateRange === "30days") {
      fromDate.setDate(fromDate.getDate() - 30);
    } else if (dateRange === "all") {
      fromDate = new Date(0);
    }
    const fromDateStr = fromDate.toISOString();

    const activities: ActivityEntry[] = [];

    const [enrollments, blogPosts, events, galleryItems, teamMembers, projects] =
      await Promise.all([
        supabase
          .from("enrollment_submissions")
          .select("id, name, email, status, created_at")
          .gte("created_at", fromDateStr)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("blog_posts")
          .select("id, title, author_name, status, created_at, updated_at")
          .gte("created_at", fromDateStr)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("events")
          .select("id, title, category, created_at, updated_at")
          .gte("created_at", fromDateStr)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("gallery_items")
          .select("id, title, created_at")
          .gte("created_at", fromDateStr)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("team_members")
          .select("id, name, role, created_at")
          .gte("created_at", fromDateStr)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("projects")
          .select("id, title, category, created_at")
          .gte("created_at", fromDateStr)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    if (enrollments.data) {
      enrollments.data.forEach((e) => {
        activities.push({
          id: `enroll-${e.id}`,
          user_id: "system",
          user_email: e.email,
          user_name: e.name,
          action: "create",
          resource_type: "enrollment",
          resource_id: e.id,
          resource_name: e.name,
          details: { status: e.status },
          created_at: e.created_at,
        });
      });
    }

    if (blogPosts.data) {
      blogPosts.data.forEach((b) => {
        activities.push({
          id: `blog-${b.id}`,
          user_id: "system",
          user_name: b.author_name,
          action: b.status === "published" ? "publish" : "create",
          resource_type: "blog_post",
          resource_id: b.id,
          resource_name: b.title,
          details: { status: b.status },
          created_at: b.created_at,
        });
      });
    }

    if (events.data) {
      events.data.forEach((e) => {
        activities.push({
          id: `event-${e.id}`,
          user_id: "system",
          action: "create",
          resource_type: "event",
          resource_id: e.id,
          resource_name: e.title,
          details: { category: e.category },
          created_at: e.created_at,
        });
      });
    }

    if (galleryItems.data) {
      galleryItems.data.forEach((g) => {
        activities.push({
          id: `gallery-${g.id}`,
          user_id: "system",
          action: "upload",
          resource_type: "gallery",
          resource_id: g.id,
          resource_name: g.title,
          created_at: g.created_at,
        });
      });
    }

    if (teamMembers.data) {
      teamMembers.data.forEach((t) => {
        activities.push({
          id: `team-${t.id}`,
          user_id: "system",
          action: "create",
          resource_type: "team_member",
          resource_id: t.id,
          resource_name: t.name,
          details: { role: t.role },
          created_at: t.created_at,
        });
      });
    }

    if (projects.data) {
      projects.data.forEach((p) => {
        activities.push({
          id: `project-${p.id}`,
          user_id: "system",
          action: "create",
          resource_type: "project",
          resource_id: p.id,
          resource_name: p.title,
          details: { category: p.category },
          created_at: p.created_at,
        });
      });
    }

    // Surface partial failures instead of silently returning a half-empty feed
    const failed = [enrollments, blogPosts, events, galleryItems, teamMembers, projects].filter((r) => r.error);
    if (failed.length === 6) {
      throw failed[0].error;
    }
    if (failed.length > 0) {
      c.header("X-Partial-Result", String(failed.length));
      console.error(JSON.stringify({ level: "error", message: "[activities] partial source failure", count: failed.length }));
    }

    activities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json(activities);
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

// ─── Instagram oEmbed Proxy ────────────────────────────────────────────────

// NOTE: this route used to call isSafeUrl() from lib/ssrfProtection, whose
// allow-list does not contain instagram.com – so EVERY request was rejected
// with 403 "URL not allowed" and the endpoint never worked. It also checked
// `hostname.includes("instagram.com")`, which accepts instagram.com.evil.com.
const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "instagr.am", "www.instagr.am"]);
const IG_PATH_RE = /^\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?$/;

app.get("/api/ig-oembed", authMiddleware, async (c) => {
  const url = c.req.query("url");
  if (!url || url.length > 500) {
    return c.json({ error: "Missing or too long 'url' query parameter" }, 400);
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }
  if (parsed.protocol !== "https:" || !IG_HOSTS.has(parsed.hostname.toLowerCase()) || parsed.username || parsed.password) {
    return c.json({ error: "URL must be an https://instagram.com link" }, 400);
  }
  if (!IG_PATH_RE.test(parsed.pathname)) {
    return c.json({ error: "URL must point to an Instagram post or reel" }, 400);
  }
  // Rebuild from validated parts – never forward the raw user string
  const canonical = `https://www.instagram.com${parsed.pathname}`;

  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(canonical)}&omitscript=true&maxwidth=480`;
    const resp = await fetch(oembedUrl, {
      headers: { "User-Agent": "SparkLabsHQ/2.0 (Cloudflare Worker)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      const noembedResp = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(canonical)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!noembedResp.ok) {
        return c.json({ error: "Instagram oEmbed unavailable", upstreamStatus: resp.status }, 502);
      }
      const noembedData = await noembedResp.json() as Record<string, unknown>;
      if (noembedData.error) {
        return c.json({ error: "Instagram oEmbed unavailable" }, 502);
      }
      c.header("Cache-Control", "private, max-age=300");
      return c.json(noembedData);
    }

    const data = await resp.json();
    c.header("Cache-Control", "private, max-age=300");
    return c.json(data);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", message: "[ig-oembed] fetch error", error: err instanceof Error ? err.message : String(err) }));
    return c.json({ error: "Failed to fetch Instagram metadata" }, 502);
  }
});

// ─── Turnstile Verification Endpoint ────────────────────────────────────────

app.post("/api/verify-turnstile", async (c) => {
  try {
    const body = await readJsonObject(c);
    const token = typeof body.token === "string" ? body.token : null;
    if (!token) return c.json({ error: "Missing 'token'" }, 400);
    const verified = await verifyTurnstile(token, c.env, getClientIP(c));
    return c.json({ success: verified });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// ─── Email Routes (async via Queue, direct Lettermint fallback) ─────────────

const ADMIN_INBOX = "admin@dvpyic.dpdns.org";

/**
 * Queue the message in production, otherwise send it synchronously.
 * Throws HttpError(503/502) with a client-safe message on failure – the three
 * routes below used to duplicate ~40 lines of this each, and the duplicated
 * copies leaked the upstream provider's error text to the browser.
 */
async function sendOrQueue(env: Env, message: EmailMessage): Promise<void> {
  if (env.EMAIL_QUEUE && env.NODE_ENV === "production") {
    await env.EMAIL_QUEUE.send(message);
    return;
  }
  if (!env.LETTERMINT_API_KEY) {
    throw new HttpError(503, "Email service not configured");
  }
  const result = await deliverEmail(env, message);
  if (!result.success) {
    console.error(JSON.stringify({ level: "error", message: "[email] direct send failed", type: message.type, error: result.error }));
    throw new HttpError(502, "Email delivery failed. Please try again later.");
  }
}

function requireString(body: Record<string, unknown>, field: string, max: number, required = true): string {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw new HttpError(400, `Missing required field: ${field}`);
    return "";
  }
  if (typeof raw !== "string") throw new HttpError(400, `Field '${field}' must be a string`);
  const value = raw.trim();
  if (required && !value) throw new HttpError(400, `Missing required field: ${field}`);
  if (value.length > max) throw new HttpError(400, `Field '${field}' must be at most ${max} characters`);
  return value;
}

app.post("/api/send-contact-message", async (c) => {
  try {
    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const name = singleLine(requireString(body, "name", 100), 100);
    const email = requireString(body, "email", 254).toLowerCase();
    const message = requireString(body, "message", 5000);
    if (!name) return c.json({ error: "Missing required field: name" }, 400);
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    // Turnstile (required for public form submissions)
    const turnstileToken = c.req.header("X-Turnstile-Token");
    if (!turnstileToken) {
      return c.json({ error: "Security verification required. Please complete the challenge." }, 403);
    }
    if (!(await verifyTurnstile(turnstileToken, c.env, getClientIP(c)))) {
      return c.json({ error: "Security verification failed. Please try again." }, 403);
    }

    const idempotencyKey = crypto.randomUUID();

    // The admin notification is the one that matters – fail the request if it can't be delivered
    await sendOrQueue(c.env, {
      type: "contact",
      to: ADMIN_INBOX,
      subject: `Contact Message from ${name}`,
      body: message,
      replyTo: email,
      idempotencyKey,
    });

    // Confirmation to the sender is best-effort and must never fail the request
    try {
      await sendOrQueue(c.env, {
        type: "contact_confirmation",
        to: email,
        subject: "Thank you for contacting YICDVP",
        body: `Dear ${name},\n\nThank you for reaching out to us. We have received your message and will get back to you as soon as possible.\n\nBest regards,\nYICDVP Team`,
        idempotencyKey: `${idempotencyKey}-confirm`,
      });
    } catch (confirmErr) {
      console.warn(JSON.stringify({ level: "warn", message: "[send-contact-message] confirmation email failed", error: confirmErr instanceof Error ? confirmErr.message : String(confirmErr) }));
    }

    return c.json({ success: true, message: "Message sent successfully" });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

// Footer newsletter box. It used to POST to /api/send-contact-message WITHOUT a
// Turnstile token, so in production it always got 403 and failed silently.
app.post("/api/newsletter-subscribe", async (c) => {
  try {
    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const email = requireString(body, "email", 254).toLowerCase();
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    await sendOrQueue(c.env, {
      type: "contact",
      to: ADMIN_INBOX,
      subject: "Newsletter subscription request",
      body: `Please add ${email} to the newsletter list.`,
      replyTo: email,
      idempotencyKey: crypto.randomUUID(),
    });
    return c.json({ success: true, message: "Subscribed" });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

app.post("/api/send-enrollment-notification", authMiddleware, requirePermission("enrollments"), async (c) => {
  try {
    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const name = singleLine(requireString(body, "name", 100, false), 100);
    const email = requireString(body, "email", 254).toLowerCase();
    const message = requireString(body, "message", 5000);
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    await sendOrQueue(c.env, {
      type: "enrollment",
      to: email,
      subject: name ? `Enrollment Confirmation - ${name}` : "Enrollment Confirmation",
      body: message,
      idempotencyKey: crypto.randomUUID(),
    });
    return c.json({ success: true, message: "Notification sent" });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

app.post("/api/send-enrollment-update", authMiddleware, requirePermission("enrollments"), async (c) => {
  try {
    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const name = singleLine(requireString(body, "name", 100, false), 100);
    const email = requireString(body, "email", 254).toLowerCase();
    const message = requireString(body, "message", 5000);
    const subject = singleLine(requireString(body, "subject", 200, false), 200);
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    await sendOrQueue(c.env, {
      type: "enrollment_update",
      to: email,
      subject: subject || (name ? `Enrollment Update - ${name}` : "Enrollment Status Update"),
      body: message,
      idempotencyKey: crypto.randomUUID(),
    });
    return c.json({ success: true, message: "Update notification sent" });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

// ─── Upload Media (Direct to Supabase Storage) ─────────────────────────────

const UPLOAD_EXT_TO_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime',
  webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  '3gp': 'video/3gpp', ogv: 'video/ogg',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
  pdf: 'application/pdf',
};

// NOTE: image/svg+xml is intentionally excluded — SVGs can carry executable JS and
// buckets serve them with Content-Type: image/svg+xml, enabling stored XSS.
const UPLOAD_ALLOWED_MIMES = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'image/avif', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
  'video/x-matroska', 'video/x-msvideo', 'video/3gpp', 'video/ogg',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
  'application/pdf',
]);

// Cloudflare caps request bodies at 100 MB (Free/Pro) and a Worker has 128 MB of
// memory, so the previous 500 MB video limit could never succeed – it just
// produced an opaque platform error / OOM. Keep limits inside what the runtime
// can actually accept; larger videos should go through a direct/resumable upload.
const UPLOAD_SIZE_LIMITS: Record<string, number> = {
  image: 25 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 95 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
};
const UPLOAD_HARD_MAX = 95 * 1024 * 1024;

// Canonical extension per validated MIME. The stored extension is derived from the
// MIME type we verified, NOT from the client-supplied file name (a "x.html"
// carrying PNG bytes used to be stored as .html).
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/x-m4v': 'm4v',
  'video/x-matroska': 'mkv', 'video/x-msvideo': 'avi', 'video/3gpp': '3gp', 'video/ogg': 'ogv',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
};

/** Verify the file's leading bytes really match the declared media category. */
function matchesMagicBytes(category: string, mime: string, bytes: Uint8Array): boolean {
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  const isRiff = hex.startsWith('52494646');
  const hasFtyp = ascii(4, 8) === 'ftyp';

  switch (category) {
    case 'image':
      // NOTE: SVG signatures (<?xml / <svg) were previously accepted here, so an
      // SVG with script could be uploaded under an image/png MIME → stored XSS.
      return hex.startsWith('FFD8FF')
        || hex.startsWith('89504E47')
        || hex.startsWith('47494638')
        || (isRiff && ascii(8, 12) === 'WEBP')
        || (hasFtyp && /^(heic|heix|hevc|hevx|mif1|msf1|avif|avis)/.test(ascii(8, 12)));
    case 'video':
      return hasFtyp
        || hex.startsWith('1A45DFA3')                    // Matroska / WebM
        || (isRiff && ascii(8, 11) === 'AVI')            // AVI (was always rejected before)
        || (mime === 'video/ogg' && ascii(0, 4) === 'OggS');
    case 'audio':
      return hex.startsWith('494433')                    // ID3-tagged MP3
        || (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) // MPEG frame sync (FFFB, FFF3, FFF2, …)
        || hasFtyp
        || (isRiff && ascii(8, 12) === 'WAVE')
        || ascii(0, 4) === 'OggS';
    case 'pdf':
      return hex.startsWith('25504446');
    default:
      return false;
  }
}

const UPLOAD_ALLOWED_BUCKETS = ['gallery', 'projects', 'teachers', 'blog', 'course-content', 'avatars'];

app.post("/api/upload-media", authMiddleware, async (c) => {
  const correlationId =
    c.req.header("x-correlation-id") ||
    crypto.randomUUID();
  const t0 = Date.now();
  const logCtx = (message: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ message, correlationId, elapsedMs: Date.now() - t0, ...extra });

  const reply = (status: ContentfulStatusCode, body: Record<string, unknown>) =>
    c.json({ ...body, correlationId }, status);

  try {
    console.log(logCtx('[upload-media] start', { level: 'info', method: c.req.method }));

    const user = c.get('user');
    const supabase = getSupabase(c.env);

    // Rate limit check — early, before expensive parsing. Keyed by the
    // authenticated user (not just IP) so one account can't spread across IPs
    // and shared NAT/office IPs don't throttle each other.
    const uploadRateResult = await checkRateLimitKV(
      c.env,
      `upload:${user.id}`,
      10,
      300_000,
      uploadLimiter
    );

    c.header("X-RateLimit-Remaining", String(uploadRateResult.remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(uploadRateResult.resetMs / 1000)));

    if (!uploadRateResult.allowed) {
      c.header("Retry-After", String(Math.ceil(uploadRateResult.resetMs / 1000)));
      return reply(429, { error: "Too many uploads. Please try again later.", code: "UPLOAD_RATE_LIMITED" });
    }

    let formData: FormData;
    try {
      formData = await c.req.raw.formData();
    } catch (e) {
      console.error(logCtx('[upload-media] formdata-parse-failed', { level: 'error', err: (e as Error).message }));
      return reply(400, { error: "Could not parse upload payload. Please retry.", code: "FORMDATA_PARSE" });
    }

    const fileField = formData.get('file');
    const file = fileField && typeof fileField !== 'string' ? (fileField as File) : null;
    const bucketField = formData.get('bucketName');
    const folderField = formData.get('folderPath');
    const rawBucket = typeof bucketField === 'string' && bucketField ? bucketField : 'gallery';
    const rawFolder = typeof folderField === 'string' && folderField ? folderField : 'uploads';

    if (!UPLOAD_ALLOWED_BUCKETS.includes(rawBucket)) {
      return reply(400, { error: `Invalid bucket "${rawBucket}". Allowed: ${UPLOAD_ALLOWED_BUCKETS.join(', ')}`, code: "BUCKET_INVALID" });
    }

    // RBAC: Check if the user's role has permission to upload to this bucket
    let requiredPermission = 'gallery';
    if (rawBucket === 'teachers') requiredPermission = 'team';
    if (rawBucket === 'course-content') requiredPermission = 'learning_hub';
    if (rawBucket === 'avatars') requiredPermission = 'home';
    if (rawBucket === 'projects') requiredPermission = 'projects';
    if (rawBucket === 'blog') requiredPermission = 'blog';
    
    const role = c.get('role');
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    if (!permissions.includes('all') && !permissions.includes(requiredPermission)) {
      console.warn(logCtx('[upload-media] forbidden bucket', { level: 'warn', role, requiredPermission }));
      return reply(403, { error: `Forbidden: Requires '${requiredPermission}' permission to upload to ${rawBucket}`, code: "FORBIDDEN" });
    }

    const bucketName = rawBucket;
    const folderPath = rawFolder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-/]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads';

    if (!file) {
      return reply(400, { error: "No file provided", code: "FILE_MISSING" });
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let mime = (file.type || '').toLowerCase();
    if (!mime || mime === 'application/octet-stream') {
      mime = UPLOAD_EXT_TO_MIME[ext] || mime;
    }
    const category = mime.startsWith('image/') ? 'image'
      : mime.startsWith('video/') ? 'video'
        : mime.startsWith('audio/') ? 'audio'
          : mime === 'application/pdf' ? 'pdf'
            : 'other';

    console.log(logCtx('[upload-media] file-info', { level: 'info', 
      userId: user.id, bucket: bucketName, folder: folderPath,
      name: file.name, ext, browserType: file.type, resolvedMime: mime, sizeBytes: file.size,
    }));

    if (!UPLOAD_ALLOWED_MIMES.has(mime)) {
      return reply(415, {
        error: `Unsupported media type${ext ? ` ".${ext}"` : ''}${mime ? ` (${mime})` : ''}. Allowed: images, videos, audio, and PDF.`,
        code: "MIME_UNSUPPORTED",
        detected: { mime, ext },
      });
    }

    const limit = UPLOAD_SIZE_LIMITS[category] ?? UPLOAD_HARD_MAX;
    if (file.size > limit) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      const limitMb = Math.round(limit / 1024 / 1024);
      return reply(413, {
        error: `File too large: ${sizeMb} MB. Limit for ${category} files is ${limitMb} MB.`,
        code: "FILE_TOO_LARGE",
      });
    }

    if (file.size === 0) {
      return reply(400, { error: "Uploaded file is empty", code: "FILE_EMPTY" });
    }

    // Read only the first bytes for validation – the old code copied the WHOLE
    // file into an ArrayBuffer (and then into a second Blob), tripling memory use.
    const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const hex = Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const magicMatch = matchesMagicBytes(category, mime, headerBytes);

    if (!magicMatch) {
      console.warn(logCtx('[upload-media] magic-byte-mismatch', { level: 'warn', hex: hex.substring(0, 16), mime, category }));
      return reply(415, {
        error: "File content does not match its extension or type. Upload rejected for security reasons.",
        code: "MAGIC_BYTE_MISMATCH",
      });
    }



    const fileExt = MIME_TO_EXT[mime] || 'bin';
    const originalBase = file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name;
    const safeBaseName = originalBase.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) || 'file';
    const fileName = `${safeBaseName}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName).upload(filePath, file, {
        contentType: mime,
        cacheControl: '31536000, immutable',
        upsert: false
      });

    if (uploadError) {
      console.error(logCtx('[upload-media] storage-upload-failed', { level: 'error', err: 'Storage upload failed', bucket: bucketName, path: filePath }));
      return reply(500, { error: "Storage upload failed. Please try again.", code: "STORAGE_UPLOAD" });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);



    console.log(logCtx('[upload-media] success', { level: 'info', url: publicUrl, path: filePath }));

    c.header('x-correlation-id', correlationId);
    return reply(200, {
      message: "File uploaded successfully",
      url: publicUrl, path: filePath, reused: false, code: "OK",
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error(logCtx('[upload-media] unhandled', { level: 'error', err: msg }));
    c.header('x-correlation-id', correlationId);
    return reply(500, { error: "An internal error occurred. Please try again later.", code: "INTERNAL" });
  }
});

// ─── Student Auth Middleware ────────────────────────────────────────────────



// ─── Queue Consumer (for async email processing) ────────────────────────────

// Export queue consumer alongside the fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return await app.fetch(request, env, ctx);
  },
  queue: async (batch: MessageBatch<EmailMessage>, env: Env, ctx: ExecutionContext): Promise<void> => {
    await processEmailQueue(batch, env);
  },
};

// ─── SPA Routing Fallback & Static Assets ─────────────────────────────────

const isHtmlRequest = (pathname: string, contentType: string | null): boolean => {
  if (contentType && contentType.toLowerCase().startsWith("text/html")) return true;
  if (pathname === "/" || pathname.endsWith("/")) return true;
  const last = pathname.split("/").pop() || "";
  return !last.includes(".");
};

// Unknown /api/* routes must answer with a JSON 404. They used to fall through to
// the SPA catch-all below and return index.html with status 200, which made
// client code (and edgeApi's content-type guard) treat typos as "non-JSON" and
// retry/fallback instead of surfacing a clear error.
app.all("/api/*", (c) => c.json({ error: "Not found", path: new URL(c.req.url).pathname }, 404));

// Last-resort error handler: anything thrown outside a route's own try/catch
// (middleware, body parsing, HttpError) becomes a structured JSON response.
app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(JSON.stringify({
    level: "error",
    message: "[unhandled]",
    path: new URL(c.req.url).pathname,
    method: c.req.method,
    error: err instanceof Error ? err.message : String(err),
  }));
  return c.json({ error: "An internal error occurred. Please try again later." }, 500);
});

app.all("*", async (c) => {
  if (!c.env.ASSETS) return c.notFound();
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    return c.text("Method Not Allowed", 405, { Allow: "GET, HEAD" });
  }

  try {
    const reqUrl = new URL(c.req.url);
    const pathname = reqUrl.pathname;
    const userAgent = c.req.header("User-Agent") || "";
    const isGetLike = c.req.method === "GET" || c.req.method === "HEAD";
    const botRequest = isGetLike && isBot(userAgent);

    let response = await c.env.ASSETS.fetch(c.req.raw);

    // SPA fallback ONLY for extension-less (page) routes. Missing files such as
    // /assets/chunk-abc123.js must stay 404 – serving index.html there gives the
    // browser HTML where it expects JS ("Failed to load module script") and
    // breaks users who still hold a pre-deploy bundle.
    if (response.status === 404 && isHtmlRequest(pathname, null)) {
      const fallbackUrl = new URL(c.req.url);
      fallbackUrl.pathname = "/index.html";
      response = await c.env.ASSETS.fetch(
        new Request(fallbackUrl.toString(), {
          method: c.req.method === "HEAD" ? "HEAD" : "GET",
          headers: c.req.raw.headers,
        })
      );
    }

    const contentType = response.headers.get("Content-Type");
    const servingHtml = isHtmlRequest(pathname, contentType);

    let prerendered = false;
    if (isGetLike && servingHtml && botRequest) {
      response = await injectPrerenderContent(response, pathname);
      prerendered = true;
    }

    // Edge Rendering Optimization: Automatically inject accessibility and lazy loading
    // to improve Core Web Vitals (LCP) directly from the Edge!
    if (servingHtml) {
      // @ts-ignore - HTMLRewriter is provided globally by Cloudflare Workers
      const rewriter = new HTMLRewriter()
        .on("img:not([loading])", {
          element(element) {
            element.setAttribute("loading", "lazy");
            element.setAttribute("decoding", "async");
          }
        });
      response = rewriter.transform(response);
    }

    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    headers.set("X-Content-Type-Options", "nosniff");

    if (servingHtml) {
      headers.set("X-Frame-Options", "SAMEORIGIN");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Content-Security-Policy", CSP_POLICY);
      headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), xr-spatial-tracking=()"
      );
      headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      
      // Cloudflare Early Hints (103) - Preload critical rendering assets
      // Logo is now loaded via Vite-hashed import, no static preload needed
      headers.append("Link", "<https://fonts.googleapis.com>; rel=preconnect");
      headers.append("Link", "<https://fonts.gstatic.com>; rel=preconnect; crossorigin");
      
      headers.set("Vary", "User-Agent");
      headers.set(
        "Cache-Control",
        prerendered
          ? "public, max-age=300, s-maxage=600"
          : "public, max-age=0, must-revalidate"
      );
    } else if (pathname.startsWith("/assets/") && /-[a-zA-Z0-9]{6,}\./.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\.(woff2?|ttf|otf|eot)(\?|$)/.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)(\?|$)/.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    } else if (pathname === "/manifest.json" || pathname === "/sw.js") {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "Asset fetch error", error: error instanceof Error ? error.message : String(error) }));
    return c.notFound();
  }
});
