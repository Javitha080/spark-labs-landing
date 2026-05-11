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
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://www.googletagmanager.com https://www.instagram.com https://*.cdninstagram.com https://img.youtube.com https://*.ytimg.com https://ibb.co https://*.ibb.co",
  "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app https://*.cloudflareinsights.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.ipify.org https://api64.ipify.org https://noembed.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
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

// ─── Upload Media Proxy ─────────────────────────────────────────────────────
// Proxies the multipart upload to the Supabase Edge Function server-to-server.
// This eliminates the cross-origin browser request, sidestepping CORS while
// the edge function keeps verify_jwt = true.

app.post("/api/upload-media", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Missing Authorization header", code: "AUTH_MISSING" }, 401);
  }

  const supabaseUrl =
    c.env.SUPABASE_URL ||
    (c.env.VITE_SUPABASE_PROJECT_ID ? `https://${c.env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined);

  if (!supabaseUrl) {
    return c.json({ error: "Supabase URL not configured", code: "CONFIG_ERROR" }, 500);
  }

  const edgeFnUrl = `${supabaseUrl}/functions/v1/upload-media`;
  const anonKey = c.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  // Forward all relevant headers from the client request
  const forwardHeaders = new Headers();
  forwardHeaders.set("Authorization", authHeader);
  if (anonKey) forwardHeaders.set("apikey", anonKey);
  const correlationId = c.req.header("x-correlation-id");
  if (correlationId) forwardHeaders.set("x-correlation-id", correlationId);

  // Forward the raw body (multipart form data) as-is
  const contentType = c.req.header("Content-Type");
  if (contentType) forwardHeaders.set("Content-Type", contentType);

  try {
    const body = await c.req.raw.arrayBuffer();
    const upstreamRes = await fetch(edgeFnUrl, {
      method: "POST",
      headers: forwardHeaders,
      body,
    });

    // Relay the response back to the client
    const resHeaders = new Headers();
    resHeaders.set("Content-Type", upstreamRes.headers.get("Content-Type") || "application/json");
    const resCid = upstreamRes.headers.get("x-correlation-id");
    if (resCid) resHeaders.set("x-correlation-id", resCid);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[upload-media-proxy] upstream error", err);
    return c.json(
      { error: "Upload proxy failed. Please retry.", code: "PROXY_ERROR" },
      502
    );
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
