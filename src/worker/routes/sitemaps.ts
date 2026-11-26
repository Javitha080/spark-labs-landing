import { Hono } from "hono";
import { getJsonCache } from "../cache/edge-cache";
import {
  BLOG_POSTS_CACHE_KEY,
  CANONICAL_HOST,
  type AppEnv,
} from "../lib/types";
import {
  BLOG_SLUG_RE,
  ENTITY_SLUG_RE,
  ENTITY_UUID_RE,
  INSTRUCTOR_SLUG_RE,
  escXml,
} from "../lib/sanitize";
import { getPublicSupabase } from "../lib/supabase";

const sitemapRoutes = new Hono<AppEnv>();

interface BlogPostRef {
  slug: string;
  published_at?: string;
  updated_at?: string;
}

sitemapRoutes.get("/sitemap-blog.xml", async (c) => {
  let posts: BlogPostRef[] = [];
  try {
    if (c.env.CACHE_DB) {
      const cached = await getJsonCache<BlogPostRef[]>(c.env.CACHE_DB, BLOG_POSTS_CACHE_KEY);
      if (cached) posts = cached;
    }
    if (posts.length === 0) {
      const { data, error } = await getPublicSupabase(c.env)
        .from("blog_posts")
        .select("slug,published_at,updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(500);
      if (!error && data) posts = data as BlogPostRef[];
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[sitemap-blog] lookup failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  const entries = posts
    .filter((p) => typeof p.slug === "string" && BLOG_SLUG_RE.test(p.slug))
    .map((p) => {
      const lastmod = (p.updated_at || p.published_at || "").slice(0, 10);
      const lastmodLine = /^\d{4}-\d{2}-\d{2}$/.test(lastmod) ? `    <lastmod>${lastmod}</lastmod>\n` : "";
      return `  <url>\n    <loc>https://${CANONICAL_HOST}/blog/${encodeURIComponent(p.slug)}</loc>\n${lastmodLine}    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    })
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url>\n    <loc>https://${CANONICAL_HOST}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n` +
    (entries ? entries + "\n" : "") +
    `</urlset>`;

  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=300, s-maxage=600");
  return c.body(xml);
});

sitemapRoutes.get("/sitemap-instructors.xml", async (c) => {
  let instructors: { instructor_slug: string }[] = [];
  try {
    const { data, error } = await getPublicSupabase(c.env).rpc("get_public_instructor_slugs");
    if (!error && data) instructors = data as { instructor_slug: string }[];
    else if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[sitemap-instructors] rpc failed", error: error.message })
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[sitemap-instructors] lookup failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  const entries = (instructors ?? [])
    .map((row) => (row as { instructor_slug: string }).instructor_slug)
    .filter((s) => typeof s === "string" && INSTRUCTOR_SLUG_RE.test(s))
    .map(
      (s) =>
        `  <url>\n    <loc>https://${CANONICAL_HOST}/learning-hub/instructor/${escXml(s)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    )
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url>\n    <loc>https://${CANONICAL_HOST}/learning-hub</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n` +
    (entries ? entries + "\n" : "") +
    `</urlset>`;

  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=300, s-maxage=600");
  return c.body(xml);
});

function entitySitemapXml(
  sectionLoc: string,
  sectionFreq: string,
  sectionPriority: string,
  entries: string[]
): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url>\n    <loc>${sectionLoc}</loc>\n    <changefreq>${sectionFreq}</changefreq>\n    <priority>${sectionPriority}</priority>\n  </url>\n` +
    (entries.length > 0 ? entries.join("\n") + "\n" : "") +
    `</urlset>`
  );
}

sitemapRoutes.get("/sitemap-projects.xml", async (c) => {
  let ids: string[] = [];
  try {
    const { data, error } = await getPublicSupabase(c.env)
      .from("projects")
      .select("id")
      .limit(1000);
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[sitemap-projects] lookup failed", error: error.message })
      );
    } else if (data) {
      ids = (data as { id: string }[]).map((row) => row.id);
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[sitemap-projects] lookup failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  const entries = ids
    .filter((id) => typeof id === "string" && ENTITY_UUID_RE.test(id))
    .map(
      (id) =>
        `  <url>\n    <loc>https://${CANONICAL_HOST}/project/${escXml(id)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    );

  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=300, s-maxage=600");
  return c.body(
    entitySitemapXml(`https://${CANONICAL_HOST}/projects`, "weekly", "0.7", entries)
  );
});

sitemapRoutes.get("/sitemap-courses.xml", async (c) => {
  let slugs: string[] = [];
  try {
    const { data, error } = await getPublicSupabase(c.env)
      .from("learning_courses")
      .select("slug")
      .eq("is_published", true)
      .limit(1000);
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[sitemap-courses] lookup failed", error: error.message })
      );
    } else if (data) {
      slugs = (data as { slug: string }[]).map((row) => row.slug);
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[sitemap-courses] lookup failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  const entries = slugs
    .filter((slug) => typeof slug === "string" && slug.length <= 200 && ENTITY_SLUG_RE.test(slug.toLowerCase()))
    .map(
      (slug) =>
        `  <url>\n    <loc>https://${CANONICAL_HOST}/learning-hub/course/${encodeURIComponent(slug)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    );

  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=300, s-maxage=600");
  return c.body(
    entitySitemapXml(`https://${CANONICAL_HOST}/learning-hub`, "daily", "0.9", entries)
  );
});

sitemapRoutes.get("/sitemap-workshops.xml", async (c) => {
  let ids: string[] = [];
  try {
    const { data, error } = await getPublicSupabase(c.env)
      .from("learning_workshops")
      .select("id")
      .eq("is_published", true)
      .limit(1000);
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[sitemap-workshops] lookup failed", error: error.message })
      );
    } else if (data) {
      ids = (data as { id: string }[]).map((row) => row.id);
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[sitemap-workshops] lookup failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  const entries = ids
    .filter((id) => typeof id === "string" && ENTITY_UUID_RE.test(id))
    .map(
      (id) =>
        `  <url>\n    <loc>https://${CANONICAL_HOST}/learning-hub/workshop/${escXml(id)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    );

  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=300, s-maxage=600");
  return c.body(
    entitySitemapXml(`https://${CANONICAL_HOST}/learning-hub`, "daily", "0.9", entries)
  );
});

export default sitemapRoutes;
