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
  "img-src 'self' data: blob: https://gtwqjuisdmbqlsjlatyj.supabase.co https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://static.vecteezy.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://www.shutterstock.com https://*.dpdns.org https://dvpyic.dpdns.org https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' blob: https://gtwqjuisdmbqlsjlatyj.supabase.co https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://static.vecteezy.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app https://cloudflareinsights.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com https://*.shutterstock.com https://www.shutterstock.com https://*.dpdns.org https://dvpyic.dpdns.org https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.ipify.org",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com",
  "child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com",
  "media-src 'self' blob: https://gtwqjuisdmbqlsjlatyj.supabase.co https://*.supabase.co https://*.supabase.in https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com",
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
  c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  c.header("Cross-Origin-Resource-Policy", "same-site");
  c.header("Cross-Origin-Embedder-Policy", "credentialless");

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
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ─── SPA Routing Fallback & Static Assets ─────────────────────────────────

app.all("*", async (c) => {
  if (c.env.ASSETS) {
    try {
      // First, try to fetch the actual static asset (e.g. /manifest.json, /assets/main.js)
      const response = await c.env.ASSETS.fetch(c.req.raw);

      // If the asset doesn't exist, and it's not an API route (which is already caught above),
      // we fallback to index.html for React Router's SPA routing.
      if (response.status === 404) {
        const url = new URL(c.req.url);
        url.pathname = "/index.html";
        let fallbackResponse = await c.env.ASSETS.fetch(
          new Request(url.toString(), {
            method: c.req.method === "HEAD" ? "HEAD" : "GET",
            headers: c.req.raw.headers,
          })
        );
        
        // ── BOT PRE-RENDERING ──
        const userAgent = c.req.header("User-Agent") || "";
        const originalPath = new URL(c.req.url).pathname;
        if (isBot(userAgent) && c.req.method === "GET") {
          fallbackResponse = await injectPrerenderContent(fallbackResponse, originalPath);
        }

        // Add security + caching headers to HTML fallback
        const htmlHeaders = new Headers(fallbackResponse.headers);
        htmlHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
        htmlHeaders.set("X-Content-Type-Options", "nosniff");
        htmlHeaders.set("X-Frame-Options", "SAMEORIGIN");
        htmlHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
        htmlHeaders.set("Content-Security-Policy", CSP_POLICY);
        htmlHeaders.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
        htmlHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");

        return new Response(fallbackResponse.body, {
          status: fallbackResponse.status,
          headers: htmlHeaders,
        });
      }
      
      // ── CACHE HEADERS FOR STATIC ASSETS ──
      const reqUrl = new URL(c.req.url);
      const pathname = reqUrl.pathname;
      const assetHeaders = new Headers(response.headers);

      // HSTS on all responses
      assetHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      assetHeaders.set("X-Content-Type-Options", "nosniff");

      // Hashed assets (contain -[hash]. in filename) — immutable long-term cache
      if (pathname.startsWith("/assets/") && /\-[a-zA-Z0-9]{6,}\./.test(pathname)) {
        assetHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      // Font files — also long-term cacheable
      else if (/\.(woff2?|ttf|otf|eot)(\?|$)/.test(pathname)) {
        assetHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      // Images (club-logo, favicon) — cache but allow revalidation
      else if (/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)(\?|$)/.test(pathname)) {
        assetHeaders.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      }
      // manifest.json, sw.js — short cache
      else if (pathname === "/manifest.json" || pathname === "/sw.js") {
        assetHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
      }
      // HTML files
      else if (pathname.endsWith(".html") || pathname === "/") {
        assetHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
        assetHeaders.set("Content-Security-Policy", CSP_POLICY);
        assetHeaders.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      }

      return new Response(response.body, {
        status: response.status,
        headers: assetHeaders,
      });
    } catch (error) {
      console.error("Asset fetch error:", error);
      return c.notFound();
    }
  }
  return c.notFound();
});

export default app;
