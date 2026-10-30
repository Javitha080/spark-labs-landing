/**
 * Best-effort blog engagement tracking.
 *
 * Writes `blog_view` / `blog_share` rows to `analytics_events`. RLS whitelists
 * those event types for anon + authenticated inserts and requires the row's
 * user_id to match auth.uid() whenever a session exists, so we resolve the
 * session before inserting (omitting user_id would make the insert fail for
 * signed-in readers).
 *
 * Fire-and-forget: a tracking failure must never break reading or sharing.
 * Repeats within the same browser session are de-duplicated via
 * sessionStorage so one reader doesn't inflate the numbers.
 */
import { supabase } from "@/integrations/supabase/client";

const sessionKey = (slug: string, kind: string) => `blog_event:${kind}:${slug}`;

type BlogEventType = "blog_view" | "blog_share";

function alreadyTracked(slug: string, kind: BlogEventType): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(sessionKey(slug, kind)) === "1";
  } catch {
    return false; // storage unavailable (e.g. strict private mode)
  }
}

function markTracked(slug: string, kind: BlogEventType): void {
  try {
    window.sessionStorage.setItem(sessionKey(slug, kind), "1");
  } catch {
    // No storage - the event still goes out once per call site
  }
}

async function insertEvent(eventType: BlogEventType, slug: string): Promise<void> {
  let userId: string | null = null;
  try {
    // Reads the local session snapshot - no network round trip.
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user?.id ?? null;
  } catch {
    // Treat as anonymous; the insert below still qualifies under RLS.
  }

  const payload: {
    event_type: string;
    page_url: string;
    event_data: { slug: string };
    user_id?: string;
  } = {
    event_type: eventType,
    page_url: window.location.pathname,
    event_data: { slug },
  };
  if (userId) payload.user_id = userId;

  const { error } = await supabase.from("analytics_events").insert([payload]);
  if (error) throw error;
}

/** Count a reader opening a post. At most once per browser session per slug. */
export function trackBlogView(slug: string): void {
  if (!slug || alreadyTracked(slug, "blog_view")) return;
  markTracked(slug, "blog_view");
  insertEvent("blog_view", slug).catch(() => undefined);
}

/** Count a share action on a post. At most once per browser session per slug. */
export function trackBlogShare(slug: string): void {
  if (!slug || alreadyTracked(slug, "blog_share")) return;
  markTracked(slug, "blog_share");
  insertEvent("blog_share", slug).catch(() => undefined);
}
