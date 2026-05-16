import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { createClient, type User } from "@supabase/supabase-js";
import sanitizeHtml from "sanitize-html";
import { isBot, injectPrerenderContent } from "./prerender";
import type { ContentfulStatusCode } from "hono/utils/http-status";
// import { analyticsMiddleware } from "./middleware/analytics";
import {
  getCachedSchedule,
  cacheSchedule,
  invalidateCache,
  isCacheStale,
} from "./cache/edge-cache";
import { processEmailQueue, type EmailMessage } from "./queues/email-consumer";
import type {
  ExecutionContext,
  MessageBatch,
  KVNamespace,
  D1Database,
  Queue,
} from "@cloudflare/workers-types";

// ─── Constants ──────────────────────────────────────────────────────────────

const APP_VERSION = "0.0.0";
const APP_NAME = "Spark Labs HQ – YICDVP";



// Consolidated Content Security Policy (single source of truth)
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.instagram.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://www.googletagmanager.com https://www.instagram.com https://*.cdninstagram.com https://img.youtube.com https://*.ytimg.com https://ibb.co https://*.ibb.co https://upload.wikimedia.org",
  "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app https://*.cloudflareinsights.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.ipify.org https://api64.ipify.org https://noembed.com https://api.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com https://api.lettermint.co",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com",
  "child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "media-src 'self' blob: https://*.supabase.co https://*.supabase.in https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  LETTERMINT_API_KEY?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  RATE_LIMIT_KV?: KVNamespace;
  CACHE_DB?: D1Database;
  EMAIL_QUEUE?: Queue<EmailMessage>;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const sanitizeObject = (obj: unknown): unknown => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const sanitized: Record<string, unknown> = {
    ...(obj as Record<string, unknown>),
  };
  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeHtml(sanitized[key]);
    } else if (
      typeof sanitized[key] === "object" &&
      sanitized[key] !== null
    ) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  return sanitized;
};

// Sanitize errors to prevent leaking DB internals/stack details to clients
const sanitizeError = (error: unknown): string => {
  console.error("[INTERNAL ERROR]", error instanceof Error ? error.message : error);
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
 * Provides globally consistent rate limiting across all edge locations.
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
    const now = Date.now();
    const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;
    const countStr = await env.RATE_LIMIT_KV.get(windowKey);
    const current = countStr ? parseInt(countStr, 10) : 0;

    if (current >= maxRequests) {
      const resetMs = windowMs - (now % windowMs);
      return { allowed: false, remaining: 0, resetMs };
    }

    // Increment counter with TTL
    await env.RATE_LIMIT_KV.put(windowKey, String(current + 1), {
      expirationTtl: Math.ceil(windowMs / 1000) + 10,
    });

    return { allowed: true, remaining: maxRequests - current - 1, resetMs: windowMs };
  } catch {
    // KV failed — fall back to in-memory
    console.warn("[rate-limit] KV unavailable, falling back to in-memory");
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

const getSupabase = (env: Env) => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };

  const supabaseUrl =
    env.SUPABASE_URL ||
    (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ||
    meta.env?.VITE_SUPABASE_URL;

  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Cloudflare environment variables. " +
      "Do NOT use the publishable/anon key for the Worker."
    );
  }
  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Verify Turnstile token server-side.
 */
async function verifyTurnstile(
  token: string | null | undefined,
  env: Env
): Promise<boolean> {
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json() as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification failed:", err);
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
    const cacheableResponse = new Response(response.body, {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
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
    return cached ?? null;
  } catch {
    return null;
  }
}

// ─── App ────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// ─── Analytics Engine Middleware (disabled - not available on free tier) ─────

// app.use("*", analyticsMiddleware);

// ─── HTTPS + Canonical-Host Redirect (must be first) ────────────────────────

const CANONICAL_HOST = "dvpyic.dpdns.org";

app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const host = url.hostname;

  const isPreviewEnv =
    host === "localhost" ||
    host === "127.0.0.1" ||
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

// ─── Global CORS ────────────────────────────────────────────────────────────

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      const prodOrigin = "https://dvpyic.dpdns.org";
      let chosen = prodOrigin;

      if (!origin) {
        chosen = prodOrigin;
      } else if (origin.startsWith("http://localhost:")) {
        chosen = origin;
      } else if (origin.startsWith("http://127.0.0.1:")) {
        chosen = origin;
      } else if (origin.endsWith(".pages.dev")) {
        chosen = origin;
      } else if (origin === prodOrigin) {
        chosen = origin;
      } else {
        chosen = prodOrigin;
      }

      return chosen;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Turnstile-Token"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 86400,
    credentials: true,
  })
);

// ─── Rate Limiting Middleware ───────────────────────────────────────────────

const getRateLimiter = (path: string) => {
  if (path.includes("/send-contact-message") || path.includes("/schedule") || path.includes("/send-enrollment")) {
    return contactLimiter;
  }
  if (path.startsWith("/api/admin") || path.includes("/activity-log") || path.includes("/blog")) {
    return authApiLimiter;
  }
  return publicApiLimiter;
};

app.use("/api/*", async (c, next) => {
  const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
  const path = new URL(c.req.url).pathname;
  const limiter = getRateLimiter(path);

  // Use KV-backed rate limiter
  const result = await checkRateLimitKV(
    c.env,
    `${clientIP}:${path}`,
    limiter.maxRequests ?? 30,
    limiter.windowMs ?? 60_000,
    limiter
  );

  c.header("X-RateLimit-Remaining", String(result.remaining));
  c.header("X-RateLimit-Reset", String(Math.ceil(result.resetMs / 1000)));

  if (!result.allowed) {
    c.header("Retry-After", String(Math.ceil(result.resetMs / 1000)));
    return c.json({ error: "Too many requests. Please try again later." }, 429);
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

const authMiddleware = async (
  c: Context<{ Bindings: Env; Variables: { user: User } }>,
  next: Next
) => {
  const authHeader = c.req.header("Authorization");

  const isBearer = !!authHeader && authHeader.startsWith("Bearer ");
  const token = isBearer ? authHeader.split(" ")[1] : "";

  if (!isBearer) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }
  const supabase = getSupabase(c.env);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: "Unauthorized: Invalid token" }, 401);
  }

  const CMS_ACCESS_ROLES = ['admin', 'editor', 'content_creator', 'coordinator'];
  let hasAdminAccess = false;

  try {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role && CMS_ACCESS_ROLES.includes(roleData.role)) {
      hasAdminAccess = true;
    } else {
      const { data: mgmtData } = await supabase
        .from("users_management")
        .select("role_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (mgmtData?.role_id) {
        const { data: extRoleData } = await supabase
          .from("roles")
          .select("name")
          .eq("id", mgmtData.role_id)
          .maybeSingle();

        if (extRoleData?.name && CMS_ACCESS_ROLES.includes(extRoleData.name)) {
          hasAdminAccess = true;
        }
      }
    }
  } catch (err) {
    console.error(`[authMiddleware] Role verification failed for user ${user.id}:`, err);
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 500);
  }

  if (!hasAdminAccess) {
    return c.json({ error: "Forbidden: CMS access required" }, 403);
  }

  c.set("user", user);
  await next();
};

// ─── Health & Info Endpoints (with Cloudflare Cache API) ────────────────────

app.get("/api/health", async (c) => {
  // Try cache first
  const cached = await getCachedResponse(c.req.raw);
  if (cached) {
    c.header("X-Cache", "HIT");
    return cached;
  }

  const response = c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: c.env.NODE_ENV || "production",
    uptime: "edge",
  });

  // Cache for 30 seconds
  await cacheResponse(c.req.raw, response, 30);
  c.header("X-Cache", "MISS");
  return response;
});

app.get("/api/info", async (c) => {
  const cached = await getCachedResponse(c.req.raw);
  if (cached) {
    c.header("X-Cache", "HIT");
    return cached;
  }

  const response = c.json({
    name: APP_NAME,
    version: APP_VERSION,
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

  await cacheResponse(c.req.raw, response, 3600);
  c.header("X-Cache", "MISS");
  return response;
});

// ─── Schedule API Routes (with D1 edge caching) ─────────────────────────────

app.get("/api/schedule", async (c) => {
  try {
    // Try D1 cache first
    if (c.env.CACHE_DB) {
      const cached = await getCachedSchedule(c.env.CACHE_DB);
      if (cached && cached.length > 0) {
        c.header("Cache-Control", "public, max-age=300, s-maxage=300");
        c.header("X-Cache", "HIT");
        c.header("X-Cache-Source", "D1");
        return c.json(cached);
      }
    }

    // Try Cloudflare Cache API
    const cfCached = await getCachedResponse(c.req.raw);
    if (cfCached) {
      c.header("X-Cache", "HIT");
      c.header("X-Cache-Source", "CF");
      return cfCached;
    }

    // Fetch from Supabase
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from("schedule")
      .select("*")
      .order("day_of_week", { ascending: true });

    if (error) throw error;

    // Cache in D1 for future requests
    if (c.env.CACHE_DB && data && data.length > 0) {
      await cacheSchedule(c.env.CACHE_DB, data as unknown as Array<Record<string, unknown>>);
    }

    // Also cache in Cloudflare Cache API
    const response = c.json(data || []);
    await cacheResponse(c.req.raw, response, 300);

    c.header("X-Cache", "MISS");
    c.header("X-Cache-Source", "Supabase");
    return response;
  } catch (error: unknown) {
    return c.json({ error: sanitizeError(error) }, 500);
  }
});

app.post("/api/schedule", authMiddleware, async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const rawBody = await c.req.json();
    const body = sanitizeObject(rawBody);
    const { data, error } = await supabase.from("schedule").insert([body]);

    if (error) throw error;

    // Invalidate D1 cache
    if (c.env.CACHE_DB) {
      await invalidateCache(c.env.CACHE_DB, "cached_schedule");
    }

    return c.json({ success: true, data });
  } catch (error: unknown) {
    return c.json({ error: sanitizeError(error) }, 500);
  }
});

app.put("/api/schedule/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabase(c.env);
    const rawBody = await c.req.json();
    const body = sanitizeObject(rawBody);
    const { data, error } = await supabase
      .from("schedule")
      .update(body)
      .eq("id", id);

    if (error) throw error;

    // Invalidate D1 cache
    if (c.env.CACHE_DB) {
      await invalidateCache(c.env.CACHE_DB, "cached_schedule");
    }

    return c.json({ success: true, data });
  } catch (error: unknown) {
    return c.json({ error: sanitizeError(error) }, 500);
  }
});

app.delete("/api/schedule/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabase(c.env);
    const { error } = await supabase.from("schedule").delete().eq("id", id);

    if (error) throw error;

    // Invalidate D1 cache
    if (c.env.CACHE_DB) {
      await invalidateCache(c.env.CACHE_DB, "cached_schedule");
    }

    return c.json({ success: true });
  } catch (error: unknown) {
    return c.json({ error: sanitizeError(error) }, 500);
  }
});

// ─── Activity Log API Routes ────────────────────────────────────────────────

app.get("/api/activities", authMiddleware, async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const dateRange = c.req.query("dateRange") || "7days";

    let fromDate = new Date();
    if (dateRange === "today") {
      fromDate.setDate(fromDate.getDate() - 1);
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

    activities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json(activities);
  } catch (error: unknown) {
    return c.json({ error: sanitizeError(error) }, 500);
  }
});

// ─── Instagram oEmbed Proxy ─────────────────────────────────────────────────

app.get("/api/ig-oembed", authMiddleware, async (c) => {
  const url = c.req.query("url");
  if (!url) {
    return c.json({ error: "Missing 'url' query parameter" }, 400);
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("instagram.com")) {
      return c.json({ error: "URL must be an instagram.com link" }, 400);
    }
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&omitscript=true&maxwidth=480`;
    const resp = await fetch(oembedUrl, {
      headers: { "User-Agent": "SparkLabsHQ/2.0 (Cloudflare Worker)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      const noembedResp = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!noembedResp.ok) {
        return c.json({ error: "Instagram oEmbed unavailable", status: resp.status }, 502);
      }
      const noembedData = await noembedResp.json() as Record<string, unknown>;
      if (noembedData.error) {
        return c.json({ error: noembedData.error }, 502);
      }
      c.header("Cache-Control", "public, max-age=300, s-maxage=600");
      return c.json(noembedData);
    }

    const data = await resp.json();
    c.header("Cache-Control", "public, max-age=300, s-maxage=600");
    return c.json(data);
  } catch (err) {
    console.error("[ig-oembed] fetch error", err);
    return c.json({ error: "Failed to fetch Instagram metadata" }, 502);
  }
});

// ─── Turnstile Verification Endpoint ────────────────────────────────────────

app.post("/api/verify-turnstile", async (c) => {
  try {
    const { token } = await c.req.json();
    const verified = await verifyTurnstile(token, c.env);
    return c.json({ success: verified });
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
});

// ─── Email Routes (async via Queue) ─────────────────────────────────────────

app.post("/api/send-contact-message", async (c) => {
  try {
    const rawBody = await c.req.json();
    const body = sanitizeObject(rawBody);
    const { name, email, message } = body as { name?: string; email?: string; message?: string };

    if (!name || !email || !message) {
      return c.json({ error: "Missing required fields: name, email, message" }, 400);
    }

    // Verify Turnstile token (required for public form submissions)
    const turnstileToken = c.req.header("X-Turnstile-Token");
    if (!turnstileToken) {
      return c.json({ error: "Security verification required. Please complete the challenge." }, 403);
    }
    const verified = await verifyTurnstile(turnstileToken, c.env);
    if (!verified) {
      return c.json({ error: "Security verification failed. Please try again." }, 403);
    }

    const idempotencyKey = crypto.randomUUID();

    // Enqueue email for async processing
    if (c.env.EMAIL_QUEUE) {
      await c.env.EMAIL_QUEUE.send({
        type: "contact",
        to: "admin@dvpyic.dpdns.org",
        subject: `Contact Message from ${name}`,
        body: message,
        replyTo: email,
        idempotencyKey,
      });

      // Also enqueue confirmation to sender
      await c.env.EMAIL_QUEUE.send({
        type: "contact_confirmation",
        to: email,
        subject: "Thank you for contacting YICDVP",
        body: `Dear ${name},\n\nThank you for reaching out to us. We have received your message and will get back to you as soon as possible.\n\nBest regards,\nYICDVP Team`,
        idempotencyKey: `${idempotencyKey}-confirm`,
      });

      return c.json({ success: true, message: "Message sent successfully" });
    }

    // Fallback: direct send via Lettermint (synchronous)
    if (!c.env.LETTERMINT_API_KEY) {
      return c.json({ error: "Email service not configured" }, 500);
    }

    const lmResp = await fetch("https://api.lettermint.co/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-lettermint-token": c.env.LETTERMINT_API_KEY,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: "YICDVP <noreply@dvpyic.dpdns.org>",
        to: ["admin@dvpyic.dpdns.org"],
        subject: `Contact Message from ${name}`,
        text: `From: ${name} (${email})\n\n${message}`,
        html: `<p><strong>From:</strong> ${name} (${email})</p><hr><p>${message.replace(/\n/g, "<br>")}</p>`,
        tag: "contact",
      }),
    });

    if (!lmResp.ok) {
      const lmErr = await lmResp.json().catch(() => ({})) as { error?: string };
      return c.json({ error: lmErr.error || "Email delivery failed" }, 500);
    }

    // Send confirmation to sender (best-effort, don't fail if this errors)
    try {
      await fetch("https://api.lettermint.co/v1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-lettermint-token": c.env.LETTERMINT_API_KEY,
          "Idempotency-Key": `${idempotencyKey}-confirm`,
        },
        body: JSON.stringify({
          from: "YICDVP <noreply@dvpyic.dpdns.org>",
          to: [email],
          subject: "Thank you for contacting YICDVP",
          text: `Dear ${name},\n\nThank you for reaching out to us. We have received your message and will get back to you as soon as possible.\n\nBest regards,\nYICDVP Team`,
          html: `<p>Dear ${name},</p><p>Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.</p><p>Best regards,<br>YICDVP Team</p>`,
          tag: "contact-confirmation",
        }),
      });
    } catch (confirmErr) {
      console.warn("[send-contact-message] Confirmation email failed:", confirmErr);
    }

    return c.json({ success: true, message: "Message sent successfully" });
  } catch (error: unknown) {
    console.error("[send-contact-message] error:", error);
    return c.json({ error: sanitizeError(error) }, 500);
  }
});

app.post("/api/send-enrollment-notification", async (c) => {
  try {
    const rawBody = await c.req.json();
    const body = sanitizeObject(rawBody);
    const { name, email, message } = body as { name?: string; email?: string; message?: string };

    if (!email || !message) {
      return c.json({ error: "Missing required fields: email, message" }, 400);
    }

    const idempotencyKey = crypto.randomUUID();

    // Enqueue email
    if (c.env.EMAIL_QUEUE) {
      await c.env.EMAIL_QUEUE.send({
        type: "enrollment",
        to: email,
        subject: name ? `Enrollment Confirmation - ${name}` : "Enrollment Confirmation",
        body: message,
        idempotencyKey,
      });

      return c.json({ success: true, message: "Notification sent" });
    }

    // Fallback: direct send via Lettermint
    if (!c.env.LETTERMINT_API_KEY) {
      return c.json({ error: "Email service not configured" }, 500);
    }

    const lmResp = await fetch("https://api.lettermint.co/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-lettermint-token": c.env.LETTERMINT_API_KEY,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: "YICDVP <noreply@dvpyic.dpdns.org>",
        to: [email],
        subject: name ? `Enrollment Confirmation - ${name}` : "Enrollment Confirmation",
        text: message,
        html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
        tag: "enrollment",
      }),
    });

    if (!lmResp.ok) {
      const lmErr = await lmResp.json().catch(() => ({})) as { error?: string };
      return c.json({ error: lmErr.error || "Email delivery failed" }, 500);
    }

    return c.json({ success: true, message: "Notification sent" });
  } catch (error: unknown) {
    console.error("[send-enrollment-notification] error:", error);
    return c.json({ error: sanitizeError(error) }, 500);
  }
});

app.post("/api/send-enrollment-update", async (c) => {
  try {
    const rawBody = await c.req.json();
    const body = sanitizeObject(rawBody);
    const { name, email, message } = body as { name?: string; email?: string; message?: string };

    if (!email || !message) {
      return c.json({ error: "Missing required fields: email, message" }, 400);
    }

    const idempotencyKey = crypto.randomUUID();

    // Enqueue email
    if (c.env.EMAIL_QUEUE) {
      await c.env.EMAIL_QUEUE.send({
        type: "enrollment_update",
        to: email,
        subject: name ? `Enrollment Update - ${name}` : "Enrollment Status Update",
        body: message,
        idempotencyKey,
      });

      return c.json({ success: true, message: "Update notification sent" });
    }

    // Fallback: direct send via Lettermint
    if (!c.env.LETTERMINT_API_KEY) {
      return c.json({ error: "Email service not configured" }, 500);
    }

    const lmResp = await fetch("https://api.lettermint.co/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-lettermint-token": c.env.LETTERMINT_API_KEY,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: "YICDVP <noreply@dvpyic.dpdns.org>",
        to: [email],
        subject: name ? `Enrollment Update - ${name}` : "Enrollment Status Update",
        text: message,
        html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
        tag: "enrollment-update",
      }),
    });

    if (!lmResp.ok) {
      const lmErr = await lmResp.json().catch(() => ({})) as { error?: string };
      return c.json({ error: lmErr.error || "Email delivery failed" }, 500);
    }

    return c.json({ success: true, message: "Update notification sent" });
  } catch (error: unknown) {
    console.error("[send-enrollment-update] error:", error);
    return c.json({ error: sanitizeError(error) }, 500);
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

const UPLOAD_ALLOWED_MIMES = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'image/svg+xml', 'image/avif', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
  'video/x-matroska', 'video/x-msvideo', 'video/3gpp', 'video/ogg',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
  'application/pdf',
]);

const UPLOAD_SIZE_LIMITS: Record<string, number> = {
  image: 25 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
};
const UPLOAD_HARD_MAX = 500 * 1024 * 1024;

const UPLOAD_ALLOWED_BUCKETS = ['gallery', 'projects', 'teachers', 'blog', 'course-content', 'avatars'];

app.post("/api/upload-media", async (c) => {
  const correlationId =
    c.req.header("x-correlation-id") ||
    crypto.randomUUID();
  const t0 = Date.now();
  const logCtx = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ correlationId, elapsedMs: Date.now() - t0, ...extra });

  const reply = (status: ContentfulStatusCode, body: Record<string, unknown>) =>
    c.json({ ...body, correlationId }, status);

  try {
    console.log('[upload-media] start', logCtx({ method: c.req.method }));

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply(401, { error: "Missing Authorization header", code: "AUTH_MISSING" });
    }

    const supabase = getSupabase(c.env);
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.warn('[upload-media] auth-failed', logCtx({ err: userError?.message }));
      return reply(401, { error: "Unauthorized", code: "AUTH_INVALID" });
    }

    const CMS_ROLES = ['admin', 'editor', 'coordinator', 'content_creator'];
    const hasRole = await hasCmsAccess(supabase, user.id, CMS_ROLES);

    if (!hasRole) {
      console.warn('[upload-media] forbidden', logCtx({ userId: user.id }));
      return reply(403, {
        error: "Forbidden: your account is not allowed to upload media. Contact an admin.",
        code: "ROLE_FORBIDDEN",
      });
    }

    let formData: FormData;
    try {
      formData = await c.req.raw.formData();
    } catch (e) {
      console.error('[upload-media] formdata-parse-failed', logCtx({ err: (e as Error).message }));
      return reply(400, { error: "Could not parse upload payload. Please retry.", code: "FORMDATA_PARSE" });
    }

    const file = formData.get('file') as File | null;
    const rawBucket = (formData.get('bucketName') as string | null) ?? 'gallery';
    const rawFolder = (formData.get('folderPath') as string | null) ?? 'uploads';

    if (!UPLOAD_ALLOWED_BUCKETS.includes(rawBucket)) {
      return reply(400, { error: `Invalid bucket "${rawBucket}". Allowed: ${UPLOAD_ALLOWED_BUCKETS.join(', ')}`, code: "BUCKET_INVALID" });
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

    console.log('[upload-media] file-info', logCtx({
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

    const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `upload:${clientIP}`;
    const uploadRateResult = await checkRateLimitKV(
      c.env,
      rateLimitKey,
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

    const arrayBuffer = await file.arrayBuffer();

    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 12));
    const hex = Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    let magicMatch = false;

    if (category === 'image') {
      if (hex.startsWith('FFD8FF')) magicMatch = true;
      else if (hex.startsWith('89504E47')) magicMatch = true;
      else if (hex.startsWith('47494638')) magicMatch = true;
      else if (hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') magicMatch = true;
      else if (hex.includes('6674797068656963')) magicMatch = true;
      else if (hex.startsWith('3C3F786D6C') || hex.startsWith('3C737667')) magicMatch = true;
    } else if (category === 'video') {
      if (hex.includes('66747970')) magicMatch = true;
      else if (hex.startsWith('1A45DFA3')) magicMatch = true;
    } else if (category === 'audio') {
      if (hex.startsWith('494433') || hex.startsWith('FFFB')) magicMatch = true;
      else if (hex.includes('66747970')) magicMatch = true;
      else if (hex.startsWith('52494646') && hex.substring(16, 24) === '57415645') magicMatch = true;
      else if (hex.startsWith('4F676753')) magicMatch = true;
    } else if (category === 'pdf') {
      if (hex.startsWith('25504446')) magicMatch = true;
    }

    if (!magicMatch) {
      console.warn('[upload-media] magic-byte-mismatch', logCtx({ hex: hex.substring(0, 16), mime, category }));
      return reply(415, {
        error: "File content does not match its extension or type. Upload rejected for security reasons.",
        code: "MAGIC_BYTE_MISMATCH",
      });
    }

    const DEDUPE_SIZE_LIMIT = 50 * 1024 * 1024;
    let fileHash: string | null = null;

    if (file.size <= DEDUPE_SIZE_LIMIT) {
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        fileHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0')).join('');

        const { data: existingAsset } = await supabase
          .from('media_assets').select('*').eq('file_hash', fileHash).eq('bucket_name', bucketName).maybeSingle();

        if (existingAsset) {
          console.log('[upload-media] dedupe-hit', logCtx({ url: existingAsset.public_url }));
          return reply(200, {
            message: "File detected and reused",
            url: existingAsset.public_url, path: existingAsset.file_path, reused: true, code: "OK_REUSED",
          });
        }
      } catch (dedupeErr) {
        console.warn('[upload-media] dedupe-check-skipped', logCtx({ err: (dedupeErr as Error).message }));
      }
    } else {
      console.log('[upload-media] dedupe-skipped-large-file', logCtx({ sizeBytes: file.size }));
    }

    const fileExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '';
    const safeBaseName = file.name.replace(`.${fileExt}`, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const fileName = `${safeBaseName}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;
    const blob = new Blob([arrayBuffer], { type: mime });

    const { error: uploadError } = await supabase.storage
      .from(bucketName).upload(filePath, blob, {
        contentType: mime,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[upload-media] storage-upload-failed', logCtx({ err: 'Storage upload failed', bucket: bucketName, path: filePath }));
      return reply(500, { error: "Storage upload failed. Please try again.", code: "STORAGE_UPLOAD" });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    if (fileHash) {
      try {
        const { error: insertError } = await supabase
          .from('media_assets')
          .insert([{ file_hash: fileHash, bucket_name: bucketName, file_path: filePath, public_url: publicUrl, file_size: file.size, mime_type: mime }]);
        if (insertError) console.warn('[upload-media] media-asset-insert-failed', logCtx({ err: insertError.message }));
      } catch (insertErr) {
        console.warn('[upload-media] media-asset-insert-error', logCtx({ err: (insertErr as Error).message }));
      }
    }

    console.log('[upload-media] success', logCtx({ url: publicUrl, path: filePath }));

    c.header('x-correlation-id', correlationId);
    return reply(200, {
      message: "File uploaded successfully",
      url: publicUrl, path: filePath, reused: false, code: "OK",
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[upload-media] unhandled', logCtx({ err: msg }));
    c.header('x-correlation-id', correlationId);
    return reply(500, { error: "An internal error occurred. Please try again later.", code: "INTERNAL" });
  }
});

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

app.all("*", async (c) => {
  if (!c.env.ASSETS) return c.notFound();

  try {
    const reqUrl = new URL(c.req.url);
    const pathname = reqUrl.pathname;
    const userAgent = c.req.header("User-Agent") || "";
    const isGetLike = c.req.method === "GET" || c.req.method === "HEAD";
    const botRequest = isGetLike && isBot(userAgent);

    let response = await c.env.ASSETS.fetch(c.req.raw);

    if (response.status === 404) {
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
    if (botRequest && servingHtml) {
      response = await injectPrerenderContent(response, pathname);
      prerendered = true;
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
    console.error("Asset fetch error:", error);
    return c.notFound();
  }
});
