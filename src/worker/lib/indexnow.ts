import { CANONICAL_HOST, type Env } from "./types";
import { BLOG_SLUG_RE } from "./sanitize";
import { getPublicSupabase } from "./supabase";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

export async function fetchRecentPublishedPostUrls(env: Env, limit: number): Promise<string[]> {
  const { data, error } = await getPublicSupabase(env)
    .from("blog_posts")
    .select("slug")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data
    .map((row) => (row as { slug: string }).slug)
    .filter((slug) => BLOG_SLUG_RE.test(slug))
    .map((slug) => `https://${CANONICAL_HOST}/blog/${encodeURIComponent(slug)}`);
}

export async function submitToIndexNow(env: Env, urls: string[]): Promise<boolean> {
  if (!env.INDEXNOW_KEY || env.NODE_ENV !== "production") return true;
  const clean = [...new Set(urls)]
    .filter((u) => u.startsWith(`https://${CANONICAL_HOST}/`))
    .slice(0, 10_000);
  if (clean.length === 0) return true;

  const body = JSON.stringify({
    host: CANONICAL_HOST,
    key: env.INDEXNOW_KEY,
    keyLocation: `https://${CANONICAL_HOST}/${env.INDEXNOW_KEY}.txt`,
    urlList: clean,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[indexnow] submission not accepted",
          status: res.status,
          urls: clean.length,
        })
      );
      return false;
    }
    console.log(JSON.stringify({ level: "info", message: "[indexnow] submitted", urls: clean.length }));
    return true;
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "[indexnow] submission failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return false;
  }
}
