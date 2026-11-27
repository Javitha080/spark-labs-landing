import {
  escapeAttr,
  type BlogPostSeoMeta,
  type EntitySeoMeta,
  type InstructorSeoMeta,
} from "../prerender";
import { getJsonCache, setJsonCache } from "../cache/edge-cache";
import {
  BLOG_SEO_META_CACHE_PREFIX,
  BLOG_SEO_META_TTL_SECONDS,
  CANONICAL_HOST,
  ENTITY_SEO_META_TTL_SECONDS,
  HOME_URL,
  INSTRUCTOR_SEO_META_CACHE_PREFIX,
  INSTRUCTOR_SEO_META_TTL_SECONDS,
  SITE_NAME_LABEL,
  type Env,
} from "./types";
import { ENTITY_SLUG_RE, ENTITY_UUID_RE, INSTRUCTOR_SLUG_RE } from "./sanitize";
import { getPublicSupabase } from "./supabase";

function isPrivateOrLocalHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1"
  ) {
    return true;
  }

  // Block integer, hex, or octal bare IP encodings (e.g. 2130706433, 0x7f000001, 0177.0.0.1)
  if (/^(?:0x[0-9a-f]+|\d+)$/i.test(host)) return true;

  // IPv4 literal checks (loopback, RFC1918, link-local/metadata, CGNAT, 0/8)
  const v4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4Match) {
    if (v4Match.slice(1).some((part) => part.length > 1 && part.startsWith("0"))) return true;
    const [a, b] = v4Match.slice(1).map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  // IPv6 private/link-local/loopback/v4-mapped ranges
  if (host.includes(":")) {
    if (
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb") ||
      host.startsWith("::ffff:") ||
      host.startsWith("0:0:0:0:0:0:0:")
    ) {
      return true;
    }
  }

  return false;
}

export function normalizeOgImageUrl(raw: string): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  // eslint-disable-next-line no-control-regex
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return "";

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return "";
    try {
      const parsed = new URL(trimmed, HOME_URL);
      if (parsed.origin !== `https://${CANONICAL_HOST}`) return "";
      if (parsed.username || parsed.password) return "";
      return parsed.toString();
    } catch {
      return "";
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    if (parsed.username || parsed.password || !parsed.hostname) return "";
    if (isPrivateOrLocalHost(parsed.hostname)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export async function loadBlogPostSeoMeta(
  env: Env,
  slug: string
): Promise<BlogPostSeoMeta | null> {
  const cacheKey = `${BLOG_SEO_META_CACHE_PREFIX}${slug}`;
  try {
    if (env.CACHE_DB) {
      const cached = await getJsonCache<BlogPostSeoMeta>(env.CACHE_DB, cacheKey);
      if (cached) return cached;
    }
    const { data, error } = await getPublicSupabase(env)
      .from("blog_posts")
      .select("title,excerpt,cover_image_url,published_at,updated_at,author_name,category,status")
      .eq("slug", slug)
      .limit(1);
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[blog-seo-meta] lookup failed", slug, error: error.message })
      );
      return null;
    }
    const row = (data ?? [])[0] as
      | {
          title: string;
          excerpt: string | null;
          cover_image_url: string | null;
          published_at: string | null;
          updated_at: string | null;
          author_name: string | null;
          category: string | null;
          status: string;
        }
      | undefined;
    if (!row || row.status !== "published") return null;
    const meta: BlogPostSeoMeta = {
      title: row.title,
      excerpt: row.excerpt ?? "",
      coverImageUrl: row.cover_image_url ?? "",
      publishedAt: row.published_at ?? "",
      updatedAt: row.updated_at ?? row.published_at ?? "",
      authorName: row.author_name ?? "",
      category: row.category ?? null,
    };
    if (env.CACHE_DB) {
      await setJsonCache(env.CACHE_DB, cacheKey, meta, BLOG_SEO_META_TTL_SECONDS);
    }
    return meta;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[blog-seo-meta] failure",
        slug,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return null;
  }
}

export async function loadInstructorSeoMeta(
  env: Env,
  rawSlug: string
): Promise<InstructorSeoMeta | null> {
  const slug = rawSlug.toLowerCase();
  if (!INSTRUCTOR_SLUG_RE.test(slug) || slug.length > 200) return null;
  const cacheKey = `${INSTRUCTOR_SEO_META_CACHE_PREFIX}${slug}`;
  try {
    if (env.CACHE_DB) {
      const cached = await getJsonCache<InstructorSeoMeta>(env.CACHE_DB, cacheKey);
      if (cached) return cached;
    }
    const { data, error } = await getPublicSupabase(env).rpc(
      "get_public_instructor_courses",
      { p_slug: slug }
    );
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[instructor-seo-meta] rpc failed", slug, error: error.message })
      );
      return null;
    }
    const rows = (data ?? []) as {
      instructor_name: string | null;
      instructor_bio: string | null;
      instructor_avatar: string | null;
      course_title: string;
      course_slug: string;
      rating_avg: number | null;
      rating_count: number | null;
      enrolled_count: number | null;
    }[];
    if (rows.length === 0) return null;
    const lead = rows[0];
    const totalStudents = rows.reduce((s, r) => s + (r.enrolled_count || 0), 0);
    const totalRatings = rows.reduce((s, r) => s + (r.rating_count || 0), 0);
    const hasRated = rows.some((r) => (r.rating_avg || 0) > 0);
    const avgRating =
      totalRatings > 0
        ? rows.reduce((s, r) => s + (r.rating_avg || 0) * (r.rating_count || 0), 0) / totalRatings
        : hasRated
          ? rows.reduce((s, r) => s + (r.rating_avg || 0), 0) / rows.length
          : null;
    const meta: InstructorSeoMeta = {
      name: lead.instructor_name || "",
      bio: lead.instructor_bio || "",
      avatarUrl: lead.instructor_avatar || "",
      courseCount: rows.length,
      totalStudents,
      avgRating,
      courses: rows
        .map((r) => ({ title: r.course_title, slug: r.course_slug }))
        .filter((c) => typeof c.slug === "string" && c.slug.length > 0)
        .slice(0, 20),
    };
    if (env.CACHE_DB) {
      await setJsonCache(env.CACHE_DB, cacheKey, meta, INSTRUCTOR_SEO_META_TTL_SECONDS);
    }
    return meta;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[instructor-seo-meta] failure",
        slug,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return null;
  }
}

function baseUrlPartList(...items: (string | null | undefined)[]): string {
  return items.filter((s): s is string => typeof s === "string" && s.length > 0).join(" · ");
}

export async function loadProjectSeoMeta(
  env: Env,
  id: string
): Promise<EntitySeoMeta | null> {
  if (!ENTITY_UUID_RE.test(id)) return null;
  const cacheKey = `project_seo_meta:${id}`;
  try {
    if (env.CACHE_DB) {
      const cached = await getJsonCache<EntitySeoMeta>(env.CACHE_DB, cacheKey);
      if (cached) return cached;
    }
    const { data, error } = await getPublicSupabase(env)
      .from("projects")
      .select("title, description, image_url, category")
      .eq("id", id)
      .limit(1);
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[project-seo-meta] lookup failed", id, error: error.message })
      );
      return null;
    }
    const row = (data ?? [])[0] as
      | { title: string; description: string | null; image_url: string | null; category: string | null }
      | undefined;
    if (!row) return null;
    const title = row.title || "Student Project";
    const description =
      (row.description || "").slice(0, 300) ||
      `View "${title}" in the Young Innovators Club student project gallery.`;
    const meta: EntitySeoMeta = {
      title,
      description,
      imageUrl: row.image_url || "",
      ogType: "website",
      breadcrumbs: [
        { name: "Home", item: HOME_URL },
        { name: "Projects", item: `${HOME_URL}projects` },
        { name: title, item: `${HOME_URL}project/${id}` },
      ],
      bodyHtml:
        `<section><h1>${escapeAttr(title)}</h1>` +
        (row.category ? `<p><em>${escapeAttr(row.category)}</em></p>` : "") +
        (row.description ? `<p>${escapeAttr(row.description.slice(0, 500))}</p>` : "") +
        `<p><a href="/projects">Browse more student projects</a></p></section>`,
      jsonLdBlocks: [],
    };
    if (env.CACHE_DB) {
      await setJsonCache(env.CACHE_DB, cacheKey, meta, ENTITY_SEO_META_TTL_SECONDS);
    }
    return meta;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[project-seo-meta] failure",
        id,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return null;
  }
}

export async function loadCourseSeoMeta(
  env: Env,
  rawSlug: string
): Promise<EntitySeoMeta | null> {
  const slug = rawSlug.toLowerCase();
  if (!ENTITY_SLUG_RE.test(slug) || slug.length > 200) return null;
  const cacheKey = `course_seo_meta:${slug}`;
  try {
    if (env.CACHE_DB) {
      const cached = await getJsonCache<EntitySeoMeta>(env.CACHE_DB, cacheKey);
      if (cached) return cached;
    }
    const { data, error } = await getPublicSupabase(env)
      .from("learning_courses")
      .select("title, description, thumbnail_url, category, level")
      .eq("slug", slug)
      .eq("is_published", true)
      .limit(1);
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[course-seo-meta] lookup failed", slug, error: error.message })
      );
      return null;
    }
    const row = (data ?? [])[0] as
      | { title: string; description: string | null; thumbnail_url: string | null; category: string | null; level: string | null }
      | undefined;
    if (!row) return null;
    const title = row.title || "STEM Course";
    const description =
      (row.description || "").slice(0, 300) ||
      `Free ${row.level || "STEM"} course on the SPARK Labs Learning Hub from the Young Innovators Club.`;
    const canonical = `https://${CANONICAL_HOST}/learning-hub/course/${encodeURIComponent(slug)}`;
    const courseBlock: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: title,
      description,
      url: canonical,
      provider: {
        "@type": "Organization",
        name: SITE_NAME_LABEL,
        sameAs: HOME_URL,
      },
    };
    const normalizedThumb = row.thumbnail_url ? normalizeOgImageUrl(row.thumbnail_url) : "";
    if (normalizedThumb) {
      courseBlock.image = normalizedThumb;
    }
    const meta: EntitySeoMeta = {
      title,
      description,
      imageUrl: row.thumbnail_url || "",
      ogType: "website",
      breadcrumbs: [
        { name: "Home", item: HOME_URL },
        { name: "Learning Hub", item: `${HOME_URL}learning-hub` },
        { name: title, item: canonical },
      ],
      bodyHtml:
        `<section><h1>${escapeAttr(title)}</h1>` +
        (row.category || row.level
          ? `<p><em>${escapeAttr(baseUrlPartList(row.category, row.level))}</em></p>`
          : "") +
        (row.description ? `<p>${escapeAttr(row.description.slice(0, 500))}</p>` : "") +
        `<p><a href="/learning-hub">Browse all courses from the Young Innovators Club</a></p></section>`,
      jsonLdBlocks: [courseBlock],
    };
    if (env.CACHE_DB) {
      await setJsonCache(env.CACHE_DB, cacheKey, meta, ENTITY_SEO_META_TTL_SECONDS);
    }
    return meta;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[course-seo-meta] failure",
        slug,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return null;
  }
}

export async function loadWorkshopSeoMeta(
  env: Env,
  id: string
): Promise<EntitySeoMeta | null> {
  if (!ENTITY_UUID_RE.test(id)) return null;
  const cacheKey = `workshop_seo_meta:${id}`;
  try {
    if (env.CACHE_DB) {
      const cached = await getJsonCache<EntitySeoMeta>(env.CACHE_DB, cacheKey);
      if (cached) return cached;
    }
    const { data, error } = await getPublicSupabase(env)
      .from("learning_workshops")
      .select("title, description, workshop_date, workshop_time, location, category")
      .eq("id", id)
      .eq("is_published", true)
      .limit(1);
    if (error) {
      console.warn(
        JSON.stringify({ level: "warn", message: "[workshop-seo-meta] lookup failed", id, error: error.message })
      );
      return null;
    }
    const row = (data ?? [])[0] as
      | {
          title: string;
          description: string | null;
          workshop_date: string | null;
          workshop_time: string | null;
          location: string | null;
          category: string | null;
        }
      | undefined;
    if (!row) return null;
    const title = row.title || "STEM Workshop";
    const description =
      (row.description || "").slice(0, 300) ||
      `Hands-on ${row.category || "STEM"} workshop at Dharmapala Vidyalaya, run by the Young Innovators Club.`;
    const canonical = `https://${CANONICAL_HOST}/learning-hub/workshop/${id}`;

    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(row.workshop_date || "");
    const timeOk = /^\d{2}:\d{2}(:\d{2})?$/.test(row.workshop_time || "");
    const startTime = timeOk
      ? row.workshop_time!.length === 5
        ? `${row.workshop_time}:00`
        : row.workshop_time!
      : "09:00:00";
    const eventBlock: Record<string, unknown> | null = dateOk
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          name: title,
          url: canonical,
          startDate: `${row.workshop_date}T${startTime}+05:30`,
          location: { "@type": "Place", name: row.location || "Dharmapala Vidyalaya" },
          organizer: { "@type": "Organization", name: SITE_NAME_LABEL, url: HOME_URL },
        }
      : null;
    const meta: EntitySeoMeta = {
      title,
      description,
      imageUrl: "",
      ogType: "website",
      breadcrumbs: [
        { name: "Home", item: HOME_URL },
        { name: "Learning Hub", item: `${HOME_URL}learning-hub` },
        { name: title, item: canonical },
      ],
      bodyHtml:
        `<section><h1>${escapeAttr(title)}</h1>` +
        (row.workshop_date || row.location
          ? `<p><em>${escapeAttr(baseUrlPartList(row.workshop_date, row.workshop_time, row.location))}</em></p>`
          : "") +
        (row.description ? `<p>${escapeAttr(row.description.slice(0, 500))}</p>` : "") +
        `<p><a href="/learning-hub">See all workshops from the Young Innovators Club</a></p></section>`,
      jsonLdBlocks: eventBlock ? [eventBlock] : [],
    };
    if (env.CACHE_DB) {
      await setJsonCache(env.CACHE_DB, cacheKey, meta, ENTITY_SEO_META_TTL_SECONDS);
    }
    return meta;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[workshop-seo-meta] failure",
        id,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return null;
  }
}

const VERIFICATION_META_NAMES: Array<[keyof Env, string]> = [
  ["SEO_GOOGLE_VERIFICATION", "google-site-verification"],
  ["SEO_BING_VERIFICATION", "msvalidate.01"],
  ["SEO_YANDEX_VERIFICATION", "yandex-verification"],
];

export function buildSearchEngineVerificationTags(env: Env): string {
  const safe = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return VERIFICATION_META_NAMES
    .map(([envKey, metaName]) => {
      const value = env[envKey];
      return typeof value === "string" && value.length > 0 && value.length <= 128
        ? `<meta name="${metaName}" content="${safe(value)}" />`
        : "";
    })
    .join("");
}
