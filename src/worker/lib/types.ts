import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  D1Database,
  KVNamespace,
  Queue,
} from "@cloudflare/workers-types";
import type { AppRole } from "../../lib/rbac";
import type { EmailMessage } from "../queues/email-consumer";
import pkg from "../../../package.json";

export const BUILD_VERSION = pkg.version;
export const APP_NAME = "Spark Labs HQ - YICDVP";
export const CANONICAL_HOST = "dvpyic.dpdns.org";
export const PROD_ORIGINS = [
  "https://dvpyic.dpdns.org",
  "https://www.dvpyic.dpdns.org",
];
export const HOME_URL = `https://${CANONICAL_HOST}/`;
export const SITE_NAME_LABEL = "Young Innovators Club";
export const ADMIN_INBOX = "admin@dvpyic.dpdns.org";

export const BLOG_POSTS_CACHE_KEY = "blog_posts:published:list";
export const EVENTS_CACHE_KEY = "events:all:list";
export const SCHEDULE_CACHE_KEY = "schedule:all:list";
export const GALLERY_CACHE_KEY = "gallery:all:list";
export const PROJECTS_CACHE_KEY = "projects:all:list";
export const RSS_FEED_CACHE_KEY_RSS = "rss:feed:xml:rss";
export const RSS_FEED_CACHE_KEY_FEED = "rss:feed:xml:feed";

export const PUBLIC_CACHE_TTL_SECONDS = 60;
export const MAX_D1_PAYLOAD_CHARS = 1_500_000;
export const ENTITY_SEO_META_TTL_SECONDS = 300;
export const BLOG_SEO_META_CACHE_PREFIX = "blog_seo_meta:";
export const BLOG_SEO_META_TTL_SECONDS = 300;
export const INSTRUCTOR_SEO_META_CACHE_PREFIX = "instructor_seo_meta:";
export const INSTRUCTOR_SEO_META_TTL_SECONDS = 300;
export const RSS_FEED_TTL_SECONDS = 300;

export interface ActivityEntry {
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

export type Env = {
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  TURNSTILE_SECRET_KEY?: string;
  LETTERMINT_API_KEY?: string;
  LETTERMINT_WEBHOOK_SECRET?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  RATE_LIMIT_KV?: KVNamespace;
  CACHE_DB?: D1Database;
  EMAIL_QUEUE?: Queue<EmailMessage>;
  ANALYTICS?: unknown;
  NATIVE_RATE_LIMITER?: unknown;
  INDEXNOW_KEY?: string;
  SEO_GOOGLE_VERIFICATION?: string;
  SEO_BING_VERIFICATION?: string;
  SEO_YANDEX_VERIFICATION?: string;
};

export type AppVariables = {
  user: User;
  role: AppRole;
  supabase: SupabaseClient;
  supabaseMode: "service" | "user";
};

export type AppEnv = {
  Bindings: Env;
  Variables: AppVariables;
};
