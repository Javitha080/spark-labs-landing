/**
 * Instagram metadata extraction — multi-provider pipeline with LRU cache.
 *
 * Provider order:
 *   1. Server-side proxy  /api/ig-oembed  (bypasses CORS reliably)
 *   2. Instagram oEmbed   api.instagram.com/oembed
 *   3. Noembed proxy      noembed.com/embed
 *   4. URL-structure parse (always succeeds)
 */

import { parseInstagramUrl, IG_TYPE_LABELS } from "./mediaUtils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InstagramMeta {
  title: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  postType: string;
  /** Which provider supplied the data — useful for debug toasts */
  providerUsed: "proxy" | "oembed" | "noembed" | "url-parse";
}

// ─── HTML Entity Decoder ────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&#039;": "'",
  "&apos;": "'",
  "&quot;": '"',
  "&#x27;": "'",
  "&#x2F;": "/",
  "&nbsp;": " ",
};

function decodeHtmlEntities(str: string): string {
  return str.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp|#039|#x27|#x2F);/gi,
    (match) => HTML_ENTITIES[match.toLowerCase()] ?? match
  );
}

/** Truncate to maxLen with ellipsis */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

// ─── In-Memory LRU Cache ────────────────────────────────────────────────────

interface CacheEntry {
  data: InstagramMeta;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;
const metaCache = new Map<string, CacheEntry>();

function getCacheKey(url: string): string {
  const parsed = parseInstagramUrl(url);
  return parsed ? `${parsed.type}/${parsed.shortcode}` : url;
}

function getCached(url: string): InstagramMeta | null {
  const key = getCacheKey(url);
  const entry = metaCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    metaCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(url: string, data: InstagramMeta): void {
  const key = getCacheKey(url);

  // Evict oldest entries if over capacity
  if (metaCache.size >= MAX_CACHE_SIZE) {
    const firstKey = metaCache.keys().next().value;
    if (firstKey !== undefined) metaCache.delete(firstKey);
  }

  metaCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Clear the in-memory metadata cache (useful for retry scenarios) */
export function clearInstagramMetaCache(url?: string): void {
  if (url) {
    metaCache.delete(getCacheKey(url));
  } else {
    metaCache.clear();
  }
}

// ─── Providers ──────────────────────────────────────────────────────────────

/** 1. Server-side proxy — bypasses CORS */
async function tryProxyOEmbed(
  url: string,
  token: string | null
): Promise<Partial<InstagramMeta> | null> {
  if (!token) return null; // no auth → skip
  try {
    const resp = await fetch(
      `/api/ig-oembed?url=${encodeURIComponent(url)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.error) return null;

    const rawTitle = decodeHtmlEntities(data.title || "");
    return {
      title: truncate(rawTitle, 120) || undefined,
      thumbnail: data.thumbnail_url || undefined,
      author: data.author_name || undefined,
    };
  } catch {
    return null;
  }
}

/** 2. Instagram official oEmbed (CORS-blocked in some browsers) */
async function tryInstagramOEmbed(
  url: string
): Promise<Partial<InstagramMeta> | null> {
  try {
    const resp = await fetch(
      `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&omitscript=true&maxwidth=480`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!resp.ok) return null;
    const data = await resp.json();

    const rawTitle = decodeHtmlEntities(data.title || "");
    return {
      title: truncate(rawTitle, 120) || undefined,
      thumbnail: data.thumbnail_url || undefined,
      author: data.author_name || undefined,
    };
  } catch {
    return null;
  }
}

/** 3. Noembed proxy */
async function tryNoembed(
  url: string
): Promise<Partial<InstagramMeta> | null> {
  try {
    const resp = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.error) return null;

    return {
      title: data.title || undefined,
      thumbnail: data.thumbnail_url || undefined,
      author: data.author_name || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

export interface FetchInstagramMetaOptions {
  /** Supabase JWT — needed for the server-side proxy */
  authToken?: string | null;
  /** Skip cache lookup (force refetch) */
  skipCache?: boolean;
}

/**
 * Fetch Instagram metadata using a multi-provider fallback pipeline.
 *
 * Always returns a result (worst-case: data derived from the URL itself).
 */
export async function fetchInstagramMetadata(
  url: string,
  options: FetchInstagramMetaOptions = {}
): Promise<InstagramMeta> {
  // ── Check cache ──
  if (!options.skipCache) {
    const cached = getCached(url);
    if (cached) return cached;
  }

  const parsed = parseInstagramUrl(url);
  const typeLabel = parsed ? (IG_TYPE_LABELS[parsed.type] ?? "Post") : "Post";

  // ── 1. Server-side proxy ──
  const proxyResult = await tryProxyOEmbed(url, options.authToken ?? null);
  if (proxyResult?.title || proxyResult?.thumbnail) {
    const author = proxyResult.author || parsed?.username || "";
    const meta: InstagramMeta = {
      title:
        proxyResult.title ||
        (author ? `${author} – Instagram ${typeLabel}` : `Instagram ${typeLabel}`),
      description: author ? `${typeLabel} by @${author}` : undefined,
      thumbnail: proxyResult.thumbnail,
      author,
      postType: typeLabel,
      providerUsed: "proxy",
    };
    setCache(url, meta);
    return meta;
  }

  // ── 2. Instagram oEmbed ──
  const oembedResult = await tryInstagramOEmbed(url);
  if (oembedResult?.title || oembedResult?.thumbnail) {
    const author = oembedResult.author || parsed?.username || "";
    const meta: InstagramMeta = {
      title:
        oembedResult.title ||
        (author ? `${author} – Instagram ${typeLabel}` : `Instagram ${typeLabel}`),
      description: author ? `${typeLabel} by @${author}` : undefined,
      thumbnail: oembedResult.thumbnail,
      author,
      postType: typeLabel,
      providerUsed: "oembed",
    };
    setCache(url, meta);
    return meta;
  }

  // ── 3. Noembed ──
  const noembedResult = await tryNoembed(url);
  if (noembedResult?.title || noembedResult?.thumbnail) {
    const author = noembedResult.author || parsed?.username || "";
    const meta: InstagramMeta = {
      title:
        noembedResult.title ||
        (author ? `${author} – Instagram ${typeLabel}` : `Instagram ${typeLabel}`),
      description: author ? `${typeLabel} by @${author}` : noembedResult.title || undefined,
      thumbnail: noembedResult.thumbnail,
      author,
      postType: typeLabel,
      providerUsed: "noembed",
    };
    setCache(url, meta);
    return meta;
  }

  // ── 4. URL-structure fallback (always succeeds) ──
  const fallback: InstagramMeta = {
    title: parsed?.username
      ? `${parsed.username} – Instagram ${typeLabel}`
      : `Instagram ${typeLabel}`,
    description: `Instagram ${typeLabel}${parsed?.shortcode ? ` (${parsed.shortcode})` : ""}`,
    thumbnail: undefined,
    author: parsed?.username,
    postType: typeLabel,
    providerUsed: "url-parse",
  };
  setCache(url, fallback);
  return fallback;
}
