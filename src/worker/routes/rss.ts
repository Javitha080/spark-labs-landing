import { Hono, type Context } from "hono";
import { getJsonCache, setJsonCache } from "../cache/edge-cache";
import { cacheResponse, getCachedResponse } from "../lib/cache";
import { safeWaitUntil } from "../lib/http";
import { escXml, singleLine, stripHtml } from "../lib/sanitize";
import { getPublicSupabase } from "../lib/supabase";
import {
  CANONICAL_HOST,
  RSS_FEED_CACHE_KEY_FEED,
  RSS_FEED_CACHE_KEY_RSS,
  RSS_FEED_TTL_SECONDS,
  SITE_NAME_LABEL,
  type AppEnv,
} from "../lib/types";

const rssRoutes = new Hono<AppEnv>();

interface RssPostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  author_name: string | null;
  category: string | null;
  published_at: string | null;
  updated_at: string | null;
}

function buildRssXml(posts: RssPostRow[], feedPath: string): string {
  const channelLink = `https://${CANONICAL_HOST}/blog`;
  const selfLink = `https://${CANONICAL_HOST}${feedPath}`;
  const lastBuildDate =
    posts[0]?.updated_at || posts[0]?.published_at
      ? new Date(posts[0].updated_at || posts[0].published_at || Date.now()).toUTCString()
      : new Date().toUTCString();

  const items = posts
    .filter((p) => typeof p.slug === "string" && p.slug.length > 0 && typeof p.title === "string")
    .map((p) => {
      const link = `https://${CANONICAL_HOST}/blog/${encodeURIComponent(p.slug)}`;
      const title = escXml(singleLine(p.title, 300));
      const description = escXml(stripHtml(p.excerpt || p.title));
      const author = p.author_name ? escXml(singleLine(p.author_name, 120)) : escXml(SITE_NAME_LABEL);
      const category = p.category ? `      <category>${escXml(singleLine(p.category, 80))}</category>\n` : "";
      const pubTs = p.published_at || p.updated_at;
      const pubDate = pubTs && !Number.isNaN(new Date(pubTs).getTime())
        ? `      <pubDate>${new Date(pubTs).toUTCString()}</pubDate>\n`
        : "";
      return (
        `    <item>\n` +
        `      <title>${title}</title>\n` +
        `      <link>${escXml(link)}</link>\n` +
        `      <guid isPermaLink="true">${escXml(link)}</guid>\n` +
        `      <description>${description}</description>\n` +
        `      <author>${author}</author>\n` +
        category +
        pubDate +
        `    </item>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    `    <title>${escXml(SITE_NAME_LABEL)} (YICDVP) — Blog &amp; News</title>\n` +
    `    <link>${channelLink}</link>\n` +
    `    <description>Stories, STEM tutorials, and announcements from the Young Innovators Club of Dharmapala Vidyalaya Pannipitiya.</description>\n` +
    `    <language>en</language>\n` +
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` +
    `    <atom:link href="${escXml(selfLink)}" rel="self" type="application/rss+xml" />\n` +
    (items ? items + "\n" : "") +
    `  </channel>\n` +
    `</rss>`
  );
}

async function handleRssFeed(
  c: Context<AppEnv>,
  feedPath: "/rss.xml" | "/feed.xml",
  d1CacheKey: string
) {
  const cfCached = await getCachedResponse(c.req.raw);
  if (cfCached) {
    cfCached.headers.set("X-Cache", "HIT");
    cfCached.headers.set("X-Cache-Source", "CF");
    return cfCached;
  }

  let xml: string | null = null;
  if (c.env.CACHE_DB) {
    xml = await getJsonCache<string>(c.env.CACHE_DB, d1CacheKey);
    if (xml) {
      c.header("X-Cache", "HIT");
      c.header("X-Cache-Source", "D1");
    }
  }

  if (!xml) {
    let posts: RssPostRow[] = [];
    try {
      const { data, error } = await getPublicSupabase(c.env)
        .from("blog_posts")
        .select("slug,title,excerpt,author_name,category,published_at,updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) {
        console.warn(JSON.stringify({ level: "warn", message: "[rss] lookup failed", error: error.message }));
      } else if (data) {
        posts = data as RssPostRow[];
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "[rss] failed to fetch posts",
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }

    xml = buildRssXml(posts, feedPath);
    if (c.env.CACHE_DB) {
      await safeWaitUntil(c, setJsonCache(c.env.CACHE_DB, d1CacheKey, xml, RSS_FEED_TTL_SECONDS));
    }
    c.header("X-Cache", "MISS");
  }

  c.header("Content-Type", "application/rss+xml; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=300, s-maxage=600");
  const response = c.body(xml);
  await safeWaitUntil(c, cacheResponse(c.req.raw, response, RSS_FEED_TTL_SECONDS));
  return response;
}

rssRoutes.get("/rss.xml", (c) => handleRssFeed(c, "/rss.xml", RSS_FEED_CACHE_KEY_RSS));
rssRoutes.get("/feed.xml", (c) => handleRssFeed(c, "/feed.xml", RSS_FEED_CACHE_KEY_FEED));

export default rssRoutes;
