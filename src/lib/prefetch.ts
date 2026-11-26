import { queryClient } from "@/lib/queryClient";
import { cleanAuthor, type PostSummary } from "@/lib/blogTypes";
import { isNewsCategory } from "@/lib/newsCategory";
import { supabase } from "@/integrations/supabase/client";
import { decodeImageOffThread } from "@/lib/animationPreload";

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

const prefetchedRoutes = new Set<string>();
const inflightDataKeys = new Set<string>();
const PREFETCH_STALE_MS = 5 * 60 * 1000;

function shouldSkipPrefetch(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

function normalizePath(path: string): string {
  const clean = path.split("#")[0].split("?")[0].trim();
  if (!clean) return "/";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

const STATIC_ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Index"),
  "/about": () => import("@/pages/AboutPage"),
  "/blog": () => import("@/pages/Blog"),
  "/news": () => import("@/pages/News"),
  "/projects": () => import("@/pages/ProjectsPage"),
  "/team": () => import("@/pages/TeamPage"),
  "/leadership": () => import("@/pages/LeadershipPage"),
  "/events": () => import("@/pages/EventsPage"),
  "/gallery": () => import("@/pages/GalleryPage"),
  "/contact": () => import("@/pages/ContactPage"),
  "/learning-hub": () => import("@/pages/LearningHub"),
  "/my-learning": () => import("@/pages/MyLearning"),
  "/student/login": () => import("@/pages/StudentLogin"),
  "/student/dashboard": () => import("@/pages/StudentDashboard"),
  "/verify": () => import("@/pages/VerifyCertificate"),
  "/privacy-policy": () => import("@/pages/PrivacyPolicy"),
  "/terms-of-service": () => import("@/pages/TermsOfService"),
};

function resolveRouteLoader(normalizedPath: string): (() => Promise<unknown>) | undefined {
  if (STATIC_ROUTE_LOADERS[normalizedPath]) {
    return STATIC_ROUTE_LOADERS[normalizedPath];
  }
  if (normalizedPath.startsWith("/blog/")) {
    return () => import("@/pages/BlogPost");
  }
  if (normalizedPath.startsWith("/project/")) {
    return () => import("@/pages/ProjectDetail");
  }
  if (normalizedPath.startsWith("/learning-hub/course/")) {
    return () => import("@/pages/CourseDetail");
  }
  if (normalizedPath.startsWith("/learning-hub/workshop/")) {
    return () => import("@/pages/WorkshopDetail");
  }
  if (normalizedPath.startsWith("/learning-hub/instructor/")) {
    return () => import("@/pages/InstructorPublic");
  }
  if (normalizedPath.startsWith("/learning-hub/classroom/")) {
    return () => import("@/pages/Classroom");
  }
  if (normalizedPath.startsWith("/learning-hub/certificate/")) {
    return () => import("@/pages/Certificate");
  }
  if (normalizedPath.startsWith("/verify/")) {
    return () => import("@/pages/VerifyCertificate");
  }
  return undefined;
}

/**
 * Prefetch a route's lazy JS chunk on hover/focus/idle.
 * Skips when Data Saver (`saveData`) or 2G connections are active, and
 * deduplicates repeated calls while allowing retries after transient errors.
 */
export function prefetchRoute(path: string): void {
  if (shouldSkipPrefetch()) return;
  const normalized = normalizePath(path);
  if (prefetchedRoutes.has(normalized)) return;

  const loader = resolveRouteLoader(normalized);
  if (!loader) return;

  prefetchedRoutes.add(normalized);
  if (normalized === "/leadership") {
    decodeImageOffThread("/assets/yic-dusk-wallpaper.webp");
  }
  void Promise.resolve()
    .then(() => loader())
    .catch(() => {
      prefetchedRoutes.delete(normalized);
    });
}

async function fetchBlogSummaries(): Promise<PostSummary[]> {
  let data: unknown[] | null = null;
  try {
    const { fetchCachedBlogPosts } = await import("@/lib/edgeApi");
    data = await fetchCachedBlogPosts<unknown[]>();
  } catch {
    const res = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .neq("category", "News")
      .order("published_at", { ascending: false });
    if (res.error) throw res.error;
    data = res.data;
  }

  return (data || [])
    .map((raw) => {
      const post = raw as Omit<PostSummary, "views"> & { views?: number };
      return {
        ...post,
        author_name: cleanAuthor(post.author_name),
        views: post.views ?? 0,
        tags: post.tags ?? null,
        reading_time_minutes: post.reading_time_minutes ?? null,
        is_featured: post.is_featured ?? false,
      } as PostSummary;
    })
    .filter((post) => !isNewsCategory(post.category));
}

async function fetchNewsPosts() {
  let data: Record<string, unknown>[] | null = null;
  try {
    const { fetchCachedBlogPosts } = await import("@/lib/edgeApi");
    data = await fetchCachedBlogPosts<Record<string, unknown>>();
  } catch {
    const res = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .eq("category", "News")
      .order("published_at", { ascending: false });
    if (res.error) throw res.error;
    data = res.data as Record<string, unknown>[] | null;
  }

  return (data || [])
    .filter((post) => isNewsCategory(post.category as string | null | undefined))
    .map((post) => ({
      ...post,
      reading_time_minutes: post.reading_time_minutes || null,
      is_featured: post.is_featured || false,
    }));
}

async function fetchEventsAscending() {
  try {
    const { fetchCachedEvents } = await import("@/lib/edgeApi");
    const data = await fetchCachedEvents<{ event_date: string }>();
    return [...data].sort((a, b) =>
      String(a.event_date).localeCompare(String(b.event_date)),
    );
  } catch {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    if (error) throw error;
    return data || [];
  }
}

async function fetchFeaturedProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("display_order", { ascending: true })
    .limit(6);
  if (error) throw error;
  return data || [];
}

async function fetchTeachersPublic() {
  const { data, error } = await supabase
    .from("teachers_public" as never)
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

const DATA_QUERY_BUILDERS: Record<string, () => Promise<unknown>> = {
  "blog-posts": fetchBlogSummaries,
  "news-posts": fetchNewsPosts,
  events: fetchEventsAscending,
  "projects-featured": fetchFeaturedProjects,
  teachers: fetchTeachersPublic,
};

/**
 * Prefetch React Query data matching the exact key & transform expected by
 * public pages (`Blog`, `News`, `Events`, `Projects`, `Teachers`).
 */
export function prefetchData(key: string): void {
  if (shouldSkipPrefetch()) return;
  const queryFn = DATA_QUERY_BUILDERS[key];
  if (!queryFn) return;
  if (inflightDataKeys.has(key)) return;

  const state = queryClient.getQueryState([key]);
  if (state?.dataUpdatedAt && Date.now() - state.dataUpdatedAt < PREFETCH_STALE_MS) {
    return;
  }

  inflightDataKeys.add(key);
  void queryClient
    .prefetchQuery({
      queryKey: [key],
      queryFn,
      staleTime: PREFETCH_STALE_MS,
    })
    .finally(() => {
      inflightDataKeys.delete(key);
    });
}
