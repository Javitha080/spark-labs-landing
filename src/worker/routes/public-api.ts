import { Hono } from "hono";
import { ROLE_PERMISSIONS } from "../../lib/rbac";
import { authMiddleware, requirePermission } from "../middleware/auth";
import { purgePublicCache, serveCachedList } from "../lib/cache";
import { handleRouteError, isAllowedOrigin, readJsonObject, safeWaitUntil } from "../lib/http";
import { fetchRecentPublishedPostUrls, submitToIndexNow } from "../lib/indexnow";
import { BLOG_SLUG_RE } from "../lib/sanitize";
import { getPublicSupabase } from "../lib/supabase";
import {
  BLOG_POSTS_CACHE_KEY,
  CANONICAL_HOST,
  EVENTS_CACHE_KEY,
  GALLERY_CACHE_KEY,
  PROJECTS_CACHE_KEY,
  SCHEDULE_CACHE_KEY,
  type ActivityEntry,
  type AppEnv,
} from "../lib/types";

const publicApiRoutes = new Hono<AppEnv>();

publicApiRoutes.get("/api/blog/posts", (c) =>
  serveCachedList(c, BLOG_POSTS_CACHE_KEY, async (sb) =>
    await sb
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(200)
  )
);

publicApiRoutes.post("/api/blog/:slug/event", async (c) => {
  try {
    const origin = c.req.header("Origin") || "";
    if (!origin || !isAllowedOrigin(origin, c.env)) {
      return c.json({ error: "Blog events are only accepted from dvpyic.dpdns.org." }, 403);
    }

    const slug = c.req.param("slug");
    if (!BLOG_SLUG_RE.test(slug)) {
      return c.json({ error: "Invalid slug" }, 400);
    }

    const body = await readJsonObject(c);
    const type = typeof body.type === "string" ? body.type : "";
    if (type !== "view" && type !== "share") {
      return c.json({ error: "Invalid event type" }, 400);
    }

    const { error } = await getPublicSupabase(c.env).rpc("increment_blog_engagement", {
      p_slug: slug,
      p_type: type,
    });
    if (error) {
      console.warn(JSON.stringify({ level: "warn", message: "[blog-event] increment failed", error: error.message }));
      return c.json({ ok: false }, 502);
    }
    return c.json({ ok: true });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

publicApiRoutes.get("/api/events", (c) =>
  serveCachedList(c, EVENTS_CACHE_KEY, async (sb) =>
    await sb
      .from("events")
      .select("*")
      .order("event_date", { ascending: false })
      .limit(500)
  )
);

publicApiRoutes.get("/api/gallery", (c) =>
  serveCachedList(c, GALLERY_CACHE_KEY, async (sb) =>
    await sb
      .from("gallery_items")
      .select("*")
      .order("display_order", { ascending: true })
      .limit(500)
  )
);

publicApiRoutes.get("/api/projects", (c) =>
  serveCachedList(c, PROJECTS_CACHE_KEY, async (sb) =>
    await sb
      .from("projects")
      .select("*")
      .order("display_order", { ascending: true })
      .limit(500)
  )
);

const INVALIDATABLE_KEYS: Record<string, { cacheKey: string; path: string; permission: string }> = {
  blog_posts: { cacheKey: BLOG_POSTS_CACHE_KEY, path: "/api/blog/posts", permission: "blog" },
  events: { cacheKey: EVENTS_CACHE_KEY, path: "/api/events", permission: "events" },
  cached_schedule: { cacheKey: SCHEDULE_CACHE_KEY, path: "/api/schedule", permission: "schedule" },
  gallery: { cacheKey: GALLERY_CACHE_KEY, path: "/api/gallery", permission: "gallery" },
  projects: { cacheKey: PROJECTS_CACHE_KEY, path: "/api/projects", permission: "projects" },
};

publicApiRoutes.post("/api/cache/invalidate/:key", authMiddleware, async (c) => {
  try {
    const key = c.req.param("key") || "";
    const target = Object.prototype.hasOwnProperty.call(INVALIDATABLE_KEYS, key)
      ? INVALIDATABLE_KEYS[key]
      : undefined;
    if (!target) {
      return c.json({ error: "Unknown cache key" }, 400);
    }
    const role = c.get("role");
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    if (!permissions.includes("all") && !permissions.includes(target.permission)) {
      return c.json({ error: `Forbidden: Requires '${target.permission}' permission` }, 403);
    }
    await purgePublicCache(c, target.cacheKey, target.path);

    if (key === "blog_posts") {
      try {
        const urls = await fetchRecentPublishedPostUrls(c.env, 10);
        urls.unshift(`https://${CANONICAL_HOST}/blog`);
        await safeWaitUntil(c, submitToIndexNow(c.env, urls));
      } catch {
        // Best-effort hint
      }
    }

    return c.json({ success: true, invalidated: key });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

publicApiRoutes.post("/api/indexnow", authMiddleware, requirePermission("blog"), async (c) => {
  try {
    if (!c.env.INDEXNOW_KEY) {
      return c.json({ error: "INDEXNOW_KEY is not configured" }, 503);
    }
    const body = await readJsonObject(c);
    const raw = Array.isArray(body.urls) ? body.urls : [];
    const urls = raw
      .filter((u): u is string => typeof u === "string" && u.length <= 512)
      .filter((u) => u.startsWith(`https://${CANONICAL_HOST}/`))
      .slice(0, 10_000);
    if (urls.length === 0) {
      return c.json({ error: "Provide 1-10,000 URLs starting with https://dvpyic.dpdns.org/" }, 400);
    }
    const accepted = await submitToIndexNow(c.env, urls);
    if (!accepted) {
      return c.json(
        { error: "IndexNow did not accept the submission. Sitemaps remain the source of truth; try again later." },
        502
      );
    }
    return c.json({ success: true, submitted: [...new Set(urls)].length });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

publicApiRoutes.get("/api/activities", authMiddleware, requirePermission("analytics"), async (c) => {
  try {
    const supabase = c.get("supabase");
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

    const [enrollments, blogPosts, events, galleryItems, teamMembers, projects] = await Promise.all([
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

    const failed = [enrollments, blogPosts, events, galleryItems, teamMembers, projects].filter((r) => r.error);
    if (failed.length === 6) {
      throw failed[0].error;
    }
    if (failed.length > 0) {
      c.header("X-Partial-Result", String(failed.length));
      console.error(JSON.stringify({ level: "error", message: "[activities] partial source failure", count: failed.length }));
    }

    activities.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json(activities);
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "instagr.am", "www.instagr.am"]);
const IG_PATH_RE = /^\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?$/;

publicApiRoutes.get("/api/ig-oembed", authMiddleware, async (c) => {
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
      const noembedData = (await noembedResp.json()) as Record<string, unknown>;
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
    console.error(
      JSON.stringify({
        level: "error",
        message: "[ig-oembed] fetch error",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json({ error: "Failed to fetch Instagram metadata" }, 502);
  }
});

export default publicApiRoutes;
