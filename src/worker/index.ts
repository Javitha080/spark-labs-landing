import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { createClient, type User } from "@supabase/supabase-js";
import sanitizeHtml from "sanitize-html";
import { isBot, injectPrerenderContent } from "./prerender";

// ─── Constants ──────────────────────────────────────────────────────────────

const APP_VERSION = "2.0.0";
const APP_NAME = "Spark Labs HQ – YICDVP";



// Consolidated Content Security Policy (single source of truth)
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.instagram.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://www.googletagmanager.com https://www.instagram.com https://*.cdninstagram.com https://img.youtube.com https://*.ytimg.com https://ibb.co https://*.ibb.co",
  "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app https://*.cloudflareinsights.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.ipify.org https://api64.ipify.org https://noembed.com https://api.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
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
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
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
  // Worker has no access to the client-side logError — use console.error (Workers runtime)
  console.error("[INTERNAL ERROR]", error instanceof Error ? error.message : error);
  return "An internal error occurred. Please try again later.";
};

// ─── In-Memory Rate Limiter (per-isolate, sliding window) ───────────────────

interface RateLimitEntry {
  timestamps: number[];
}

/**
 * Simple in-memory rate limiter for Cloudflare Workers.
 * Each isolate maintains its own window — this is a best-effort defence,
 * not a precise global counter. For global precision, use Cloudflare KV or Durable Objects.
 */
class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private lastCleanup: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.lastCleanup = Date.now();
  }

  /** Returns true if the request is allowed; false if rate-limited. */
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

    // Slide the window: drop timestamps older than windowMs
    entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldest = entry.timestamps[0];
      return { allowed: false, remaining: 0, resetMs: oldest + this.windowMs - now };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: this.maxRequests - entry.timestamps.length, resetMs: this.windowMs };
  }

  /** Periodic cleanup to prevent memory leaks (call every ~60s) */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs);
      if (entry.timestamps.length === 0) this.store.delete(key);
    }
  }
}

// Rate limiters with different thresholds per route category
const publicApiLimiter = new InMemoryRateLimiter(30, 60_000);   // 30 req/min for public endpoints
const authApiLimiter = new InMemoryRateLimiter(60, 60_000);     // 60 req/min for authenticated endpoints
const contactLimiter = new InMemoryRateLimiter(5, 300_000);     // 5 req/5min for contact/enrollment forms

const getSupabase = (env: Env) => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };

  const supabaseUrl =
    env.SUPABASE_URL ||
    (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ||
    meta.env?.VITE_SUPABASE_URL;

  // IMPORTANT: Worker must use SERVICE_ROLE_KEY to bypass RLS for admin operations.
  // Never fall back to the anon/publishable key — that would silently make admin
  // endpoints subject to RLS, returning empty data or failing on writes.
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Cloudflare environment variables. " +
      "Do NOT use the publishable/anon key for the Worker."
    );
  }
  return createClient(supabaseUrl, supabaseKey);
};

// ─── App ────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// ─── HTTPS + Canonical-Host Redirect (must be first) ────────────────────────

const CANONICAL_HOST = "dvpyic.dpdns.org";

app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const host = url.hostname;

  // Skip redirects for local dev and preview environments
  const isPreviewEnv =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".pages.dev") ||
    host.endsWith(".workers.dev");

  if (!isPreviewEnv) {
    // Force HTTPS
    if (url.protocol === "http:") {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      return c.redirect(url.toString(), 301);
    }
    // Force canonical host (apex)
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
      // Allow production domain
      const prodOrigin = "https://dvpyic.dpdns.org";
      let chosen = prodOrigin;

      if (!origin) {
        chosen = prodOrigin;
      } else if (origin.startsWith("http://localhost:")) {
        // Allow localhost for development
        chosen = origin;
      } else if (origin.startsWith("http://127.0.0.1:")) {
        chosen = origin;
      } else if (origin.endsWith(".pages.dev")) {
        // Allow Cloudflare Pages preview deploys
        chosen = origin;
      } else if (origin === prodOrigin) {
        // Allow production
        chosen = origin;
      } else {
        // Default: deny by returning the prod origin (browser will block mismatched origins)
        chosen = prodOrigin;
      }

      return chosen;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 86400,
    credentials: true,
  })
);

// ─── Rate Limiting Middleware ───────────────────────────────────────────────

/** Pick the right rate limiter based on the request path */
const getRateLimiter = (path: string) => {
  if (path.includes("/send-contact-message") || path.includes("/schedule") || path.includes("/send-enrollment")) {
    return contactLimiter;
  }
  // Authenticated admin routes get a more generous limit
  if (path.startsWith("/api/admin") || path.includes("/activity-log") || path.includes("/blog")) {
    return authApiLimiter;
  }
  return publicApiLimiter;
};

app.use("/api/*", async (c, next) => {
  const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
  const path = new URL(c.req.url).pathname;
  const limiter = getRateLimiter(path);
  const result = limiter.check(`${clientIP}:${path}`);

  // Always set rate limit headers
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

  // Core security headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("X-XSS-Protection", "0"); // Modern approach: rely on CSP instead
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  c.header(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  c.header("Content-Security-Policy", CSP_POLICY);

  // Cross-Origin isolation
  // NOTE: Do NOT set Cross-Origin-Embedder-Policy — it blocks cross-origin
  // requests to Supabase storage, breaking file uploads from admin pages.
  c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  c.header("Cross-Origin-Resource-Policy", "cross-origin");

  // Cache control for API responses (never cache by default)
  if (!c.res.headers.has("Cache-Control")) {
    c.header(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    c.header("Pragma", "no-cache");
  }

  // Request ID for debugging
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

  // --- STRICT ROLE VERIFICATION ---
  // Prevent Privilege Escalation: Because the worker uses SERVICE_ROLE_KEY to bypass RLS,
  // we MUST verify the user is actually an admin/editor and not a student.
  const CMS_ACCESS_ROLES = ['admin', 'editor', 'content_creator', 'coordinator'];
  let hasAdminAccess = false;

  try {
    // 1. Check user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role && CMS_ACCESS_ROLES.includes(roleData.role)) {
      hasAdminAccess = true;
    } else {
      // 2. Check extended users_management table
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
    console.error("Role verification failed", err);
  }

  if (!hasAdminAccess) {
    return c.json({ error: "Forbidden: CMS access required" }, 403);
  }
  // --------------------------------

  c.set("user", user);
  await next();
};

// ─── Health & Info Endpoints ────────────────────────────────────────────────

app.get("/api/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: c.env.NODE_ENV || "production",
    uptime: "edge", // Workers are stateless
  });
});

app.get("/api/info", (c) => {
  return c.json({
    name: APP_NAME,
    version: APP_VERSION,
    platform: "Cloudflare Workers",
    features: [
      "Edge-deployed API",
      "Supabase integration",
      "Static asset serving",
      "Security headers",
      "CORS support",
    ],
  });
});

// ─── Schedule API Routes ────────────────────────────────────────────────────

app.get("/api/schedule", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from("schedule")
      .select("*")
      .order("day_of_week", { ascending: true });

    if (error) throw error;

    // Allow short caching for public schedule data
    c.header("Cache-Control", "public, max-age=60, s-maxage=300");
    return c.json(data || []);
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

    // Fetch all resource types in parallel for faster response
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

    // Sort all activities by date (newest first)
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
// Fetches Instagram oEmbed metadata server-side to bypass CORS restrictions.
// This is the first provider in the instagramMeta.ts multi-provider pipeline.

app.get("/api/ig-oembed", authMiddleware, async (c) => {
  const url = c.req.query("url");
  if (!url) {
    return c.json({ error: "Missing 'url' query parameter" }, 400);
  }

  // Validate that it's actually an Instagram URL
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
      // Try noembed as server-side fallback
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
      // Short cache for successful metadata
      c.header("Cache-Control", "public, max-age=300, s-maxage=600");
      return c.json(noembedData);
    }

    const data = await resp.json();
    // Short cache for successful metadata
    c.header("Cache-Control", "public, max-age=300, s-maxage=600");
    return c.json(data);
  } catch (err) {
    console.error("[ig-oembed] fetch error", err);
    return c.json({ error: "Failed to fetch Instagram metadata" }, 502);
  }
});

// ─── Upload Media (Direct to Supabase Storage) ─────────────────────────────
// Uploads files directly to Supabase Storage from the Worker, eliminating the
// Edge Function middleman that caused 504 Gateway Timeouts from double-buffering.
// Auth + role check + MIME validation + SHA-256 dedupe all happen in this single hop.

// MIME resolution helpers (same as edge function for consistency)
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
  // ── Correlation ID ──
  const correlationId =
    c.req.header("x-correlation-id") ||
    crypto.randomUUID();
  const t0 = Date.now();
  const logCtx = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ correlationId, elapsedMs: Date.now() - t0, ...extra });

  const reply = (status: number, body: Record<string, unknown>) =>
    c.json({ ...body, correlationId }, status as any);

  try {
    console.log('[upload-media] start', logCtx({ method: c.req.method }));

    // ── Auth ──
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

    // ── Role Check ──
    const CMS_ROLES = ['admin', 'editor', 'coordinator', 'content_creator'];
    let hasRole = false;

    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    if (Array.isArray(roleData) && roleData.some((r: any) => CMS_ROLES.includes(r.role))) {
      hasRole = true;
    }

    if (!hasRole) {
      const { data: mgmtData } = await supabase
        .from("users_management").select("role_id").eq("user_id", user.id).maybeSingle();
      if (mgmtData?.role_id) {
        const { data: extRole } = await supabase
          .from("roles").select("name").eq("id", mgmtData.role_id).maybeSingle();
        if (extRole?.name && CMS_ROLES.includes(extRole.name)) hasRole = true;
      }
    }

    if (!hasRole) {
      console.warn('[upload-media] forbidden', logCtx({ userId: user.id }));
      return reply(403, {
        error: "Forbidden: your account is not allowed to upload media. Contact an admin.",
        code: "ROLE_FORBIDDEN",
      });
    }

    // ── Parse FormData ──
    // IMPORTANT: Use the raw Request's formData() directly.
    // Hono's parseBody() consumes the body stream and returns a plain Record,
    // NOT a FormData instance. The previous code then tried clone().formData()
    // on the already-consumed stream, which hangs → 504 Gateway Timeout.
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

    // ── Resolve MIME ──
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

    // ── Read file into memory ──
    const arrayBuffer = await file.arrayBuffer();

    // ── SHA-256 Dedupe (skip for files > 50 MB to avoid CPU timeout) ──
    const DEDUPE_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB
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
        // Dedupe is best-effort — don't block the upload if it fails
        console.warn('[upload-media] dedupe-check-skipped', logCtx({ err: (dedupeErr as Error).message }));
      }
    } else {
      console.log('[upload-media] dedupe-skipped-large-file', logCtx({ sizeBytes: file.size }));
    }

    // ── Upload to Supabase Storage ──
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;
    const blob = new Blob([arrayBuffer], { type: mime });

    const { error: uploadError } = await supabase.storage
      .from(bucketName).upload(filePath, blob, { contentType: mime, cacheControl: '3600', upsert: false });

    if (uploadError) {
      const msg = (uploadError as any)?.message || 'Upload failed';
      console.error('[upload-media] storage-upload-failed', logCtx({ err: msg, bucket: bucketName, path: filePath }));
      return reply(500, { error: `Storage upload failed: ${msg}`, code: "STORAGE_UPLOAD" });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    // ── Record in media_assets for future dedupe (best-effort) ──
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
    return reply(500, { error: msg, code: "INTERNAL" });
  }
});

// ─── Instagram oEmbed Proxy ─────────────────────────────────────────────────
// Server-side fetch to api.instagram.com/oembed — bypasses CORS restrictions
// that block this endpoint in browsers.

app.get("/api/ig-oembed", authMiddleware, async (c) => {
  const igUrl = c.req.query("url");
  if (!igUrl || !igUrl.includes("instagram.com")) {
    return c.json({ error: "Missing or invalid Instagram URL" }, 400);
  }

  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(igUrl)}&omitscript=true&maxwidth=480`;
    const resp = await fetch(oembedUrl, {
      headers: { "User-Agent": "SparkLabsHQ/2.0 (server-side proxy)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      return c.json(
        { error: `Instagram oEmbed returned ${resp.status}` },
        resp.status === 404 ? 404 : 502
      );
    }

    const data = await resp.json();

    // Cache successful responses for 5 minutes
    c.header("Cache-Control", "public, max-age=300, s-maxage=300");
    return c.json(data);
  } catch (err) {
    console.error("[ig-oembed-proxy] error", err);
    return c.json({ error: "Failed to fetch Instagram metadata" }, 502);
  }
});

// ─── SPA Routing Fallback & Static Assets ─────────────────────────────────

const isHtmlRequest = (pathname: string, contentType: string | null): boolean => {
  if (contentType && contentType.toLowerCase().startsWith("text/html")) return true;
  if (pathname === "/" || pathname.endsWith("/")) return true;
  // No file extension in last segment → treat as SPA route
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

    // First, try the actual static asset
    let response = await c.env.ASSETS.fetch(c.req.raw);

    // SPA fallback: if not found, serve index.html so React Router can handle it
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

    // ── BOT PRE-RENDERING (runs on 200 OR 404-fallback HTML responses) ──
    let prerendered = false;
    if (botRequest && servingHtml) {
      response = await injectPrerenderContent(response, pathname);
      prerendered = true;
    }

    // ── HEADERS ──
    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    headers.set("X-Content-Type-Options", "nosniff");

    if (servingHtml) {
      headers.set("X-Frame-Options", "SAMEORIGIN");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Content-Security-Policy", CSP_POLICY);
      headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      // Vary so CDN doesn't serve bot HTML to humans (or vice versa)
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

export default app;
