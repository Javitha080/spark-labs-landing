// react-doctor-disable no-giant-component
import { useEffect, useMemo } from "react";
import "@/styles/blog-reader.css";
import { useQuery } from "@tanstack/react-query";
import { sanitizeSlug } from "@/lib/sanitize";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { scrollToTop } from "@/lib/scroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleView from "@/components/blog/ArticleView";
import BackToTop from "@/components/blog/BackToTop";
import { trackBlogView } from "@/lib/blogAnalytics";
import { blogPostingJsonLd } from "@/lib/structuredData";
import { Skeleton } from "@/components/ui/skeleton";
import { processContent } from "@/lib/blog-content";
import type { PostFull, PostSummary } from "@/lib/blogTypes";
import { isNewsCategory } from "@/lib/newsCategory";

/** Chronological neighbours only carry the link fields (plus category for the news-room exclusion). */
type Neighbour = Pick<PostSummary, "id" | "title" | "slug">;

// Loading Skeleton — mirrors the ArticleView layout (article card + right rail)
const BlogPostSkeleton = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="pt-24 pb-16">
      <div className="container-custom">
        <div className="flex flex-col lg:flex-row gap-12">
          <article className="flex-1 max-w-3xl">
            <Skeleton className="h-10 w-32 mb-6" />
            <Skeleton className="h-8 w-24 mb-4" />
            <Skeleton className="h-16 w-full mb-6" />
            <div className="flex gap-4 mb-8">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="aspect-video rounded-2xl mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </article>
          <aside className="hidden lg:block w-72">
            <Skeleton className="h-80 rounded-2xl" />
          </aside>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

// Mock Data for Fallback/Demo (dev only)
const MOCK_POSTS: Record<string, PostFull> = {
  "future-robotics-sri-lanka": {
    id: "mock-1",
    title: "The Future of Robotics in Sri Lankan Schools",
    slug: "future-robotics-sri-lanka",
    content: `
      <h2>Embracing the Fourth Industrial Revolution</h2>
      <p>As we stand on the brink of a technological revolution that will fundamentally alter the way we live, work, and relate to one another, the importance of <strong>STEM education</strong> in Sri Lanka has never been more critical. Robotics, once a niche field for university researchers, is now finding its way into our classrooms.</p>

      <h3>Why Robotics Matters Now</h3>
      <p>In a rapidly developing nation like Sri Lanka, the ability to innovate is our most valuable resource. Robotics teaches students not just how to code, but how to <em>think</em>. It combines mechanical engineering, electronics, and computer science into a single, hands-on discipline.</p>
      <ul>
          <li><strong>Critical Thinking:</strong> Debugging a robot requires logical analysis.</li>
          <li><strong>Creativity:</strong> Designing a chassis from scratch pushes artistic boundaries.</li>
          <li><strong>Resilience:</strong> Robots fail often; learning to fix them builds character.</li>
      </ul>

      <h3>The YIC Initiative at Dharmapala Vidyalaya</h3>
      <p>At the <strong>Young Innovators Club</strong>, we are pioneering this shift. Our recent workshops on Arduino and ESP32 have shown that students as young as 12 can build complex systems. From line-following bots to smart irrigation systems, the potential is limitless.</p>

      <blockquote>"The best way to predict the future is to invent it." - Alan Kay</blockquote>

      <h3>Getting Started</h3>
      <p>You don't need a state-of-the-art lab to start. A simple <strong>Arduino Uno</strong> kit costs less than a textbook and opens up a world of possibilities. Check out our <a href="/learning-hub">STEM Learning Hub</a> for free tutorials to get you started today.</p>

      <h3>Conclusion</h3>
      <p>The future belongs to the makers. By integrating robotics into our curriculum and extracurriculars, we are arming the next generation of Sri Lankan leaders with the tools they need to build a smarter, more sustainable world.</p>
    `,
    excerpt: "Exploring how hands-on robotics education is transforming student innovation in Sri Lanka, starting right here at Dharmapala Vidyalaya.",
    author_name: "YIC Editorial Team",
    author_image_url: null,
    cover_image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=2070",
    category: "Robotics",
    tags: ["Education", "Sri Lanka", "Future Tech"],
    tech_stack: ["Arduino", "Education 4.0"],
    // Fixed date so the DEV fallback doesn't shift to "today" on every load.
    published_at: "2025-06-15T09:00:00.000Z",
    updated_at: "2025-06-15T09:00:00.000Z",
    reading_time_minutes: 5,
    is_featured: false,
    views: 1284,
    shares: 37,
  },
};

/** Fill in the denormalised counters (and other nullable columns) a pre-migration
 *  database row or a stale edge cache may be missing. */
const toPostFull = (row: Partial<PostFull> | null): PostFull | null => {
  if (!row) return null;
  return {
    ...row,
    views: row.views ?? 0,
    shares: row.shares ?? 0,
    tags: row.tags ?? null,
    tech_stack: row.tech_stack ?? null,
    is_featured: row.is_featured ?? false,
    reading_time_minutes: row.reading_time_minutes ?? null,
  } as PostFull;
};

const toRelatedSummaries = (rows: unknown[] | null): PostSummary[] =>
  (rows ?? []).map((raw) => {
    const r = raw as Partial<PostSummary>;
    return {
      ...r,
      views: r.views ?? 0,
      tags: r.tags ?? null,
      reading_time_minutes: r.reading_time_minutes ?? null,
      is_featured: r.is_featured ?? false,
    } as PostSummary;
  }).filter((p) => !isNewsCategory(p.category));

const BlogPostPage = () => {
  const { slug } = useParams();

  // An invalid or missing slug is derivable from the URL - no state needed.
  const slugInvalid = !slug || !sanitizeSlug(slug ?? "");

  // ─── Post data (React Query + realtime invalidation) ────────────────────────
  const postQuery = useQuery<PostFull>({
    queryKey: ["blog-post", slug],
    enabled: !!slug && !slugInvalid,
    retry: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async (): Promise<PostFull> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      const mapped = toPostFull(data as unknown as Partial<PostFull> | null);
      if (mapped) return mapped;
      // DEV fallback so the reading experience is demoable with no database.
      if (import.meta.env.DEV && slug && MOCK_POSTS[slug]) return MOCK_POSTS[slug];
      throw new Error("Post not found");
    },
  });

  const post = postQuery.data ?? null;
  const loading = postQuery.isLoading;

  // Keep the tab fresh when admins publish or edit while it is open.
  useRealtimeSync(["blog_posts"], {
    queryKeys: [["blog-posts"], ["blog-post"], ["blog-related"], ["blog-neighbours"]],
  });

  useEffect(() => {
    if (!slugInvalid) scrollToTop({ immediate: true });
  }, [slug, slugInvalid]);

  // ─── Related posts (same category or shared tag) ───────────────────────────
  const relatedQuery = useQuery<PostSummary[]>({
    queryKey: ["blog-related", post?.id ?? "none"],
    enabled: !!post && !!(post.category || (post.tags?.length ?? 0) > 0),
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<PostSummary[]> => {
      if (!post) return [];
      const conditions: string[] = [];
      if (post.category) conditions.push(`category.eq.${post.category}`);
      if (post.tags?.length) conditions.push(...post.tags.map((t) => `tags.cs.{${t}}`));
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .neq("id", post.id)
        .or(conditions.join(","))
        .limit(3);
      if (error) throw error;
      return toRelatedSummaries(data);
    },
  });
  const relatedPosts = relatedQuery.data ?? [];

  // ─── Chronological neighbours (newer / older published stories) ────────────
  const neighboursQuery = useQuery<{ newer: Neighbour | null; older: Neighbour | null }>({
    queryKey: ["blog-neighbours", post?.id ?? "none"],
    enabled: !!post,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      if (!post?.published_at) return { newer: null, older: null };
      const cols = "id, title, slug, category, published_at";
      const [newerRes, olderRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select(cols)
          .eq("status", "published")
          .neq("id", post.id)
          .gt("published_at", post.published_at)
          .order("published_at", { ascending: true })
          .limit(4),
        supabase
          .from("blog_posts")
          .select(cols)
          .eq("status", "published")
          .neq("id", post.id)
          .lt("published_at", post.published_at)
          .order("published_at", { ascending: false })
          .limit(4),
      ]);
      if (newerRes.error) throw newerRes.error;
      if (olderRes.error) throw olderRes.error;
      // The listing hides News-room posts, so neighbours skip them too.
      const slim = (rows: unknown[] | null): Neighbour | null => {
        for (const raw of rows ?? []) {
          const r = raw as { id: string; title: string; slug: string; category: string | null };
          if (isNewsCategory(r.category)) continue;
          return { id: r.id, title: r.title, slug: r.slug };
        }
        return null;
      };
      return {
        newer: slim(newerRes.data),
        older: slim(olderRes.data),
      };
    },
  });

  // One honest view event per browser session per post (counts the DB metric
  // and pings the worker's denormalised counter).
  useEffect(() => {
    if (slug) trackBlogView(slug);
  }, [slug]);

  // ─── Content: sanitise → slugged heading ids → TOC → word count ────────────
  const processed = useMemo(
    () => (post ? processContent(post.content) : { html: "", toc: [], words: 0 }),
    [post],
  );

  const notFound = slugInvalid || postQuery.error?.message === "Post not found";

  // An invalid slug renders the "Post Not Found" UI directly (derived, no state).
  if (loading && !slugInvalid) return <BlogPostSkeleton />;

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto px-4"
          >
            <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="size-10 text-destructive" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {notFound ? "Post Not Found" : "Something Went Wrong"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {notFound
                ? "The blog post you're looking for doesn't exist or may have been removed."
                : "We couldn't load this post. Please try again."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/blog">
                <Button className="btn-glow w-full sm:w-auto">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Blog
                </Button>
              </Link>
              {!notFound && (
                <Button variant="outline" onClick={() => postQuery.refetch()}>
                  Try Again
                </Button>
              )}
            </div>
          </m.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <Helmet>
        <title>{`${post.title} | ${SITE_NAME}`}</title>
        <meta name="description" content={post.excerpt || `Read "${post.title}" on the Young Innovators Club blog.`} />
        <link rel="canonical" href={`${SITE_URL}/blog/${slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/blog/${slug}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || `Read "${post.title}" on the Young Innovators Club blog.`} />
        <meta property="og:image" content={post.cover_image_url || DEFAULT_OG_IMAGE} />
        <meta property="og:site_name" content={SITE_NAME} />
        {post.published_at && <meta property="article:published_time" content={post.published_at} />}
        {post.updated_at && <meta property="article:modified_time" content={post.updated_at} />}
        <meta property="article:author" content={post.author_name} />
        {post.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt || `Read "${post.title}" on the Young Innovators Club blog.`} />
        <meta name="twitter:image" content={post.cover_image_url || DEFAULT_OG_IMAGE} />
        {post.published_at && (
          <script type="application/ld+json">{JSON.stringify({
            ...blogPostingJsonLd({
              title: post.title,
              description: post.excerpt || "",
              slug: slug ?? "",
              authorName: post.author_name,
              publishedAt: post.published_at,
              modifiedAt: post.updated_at || undefined,
              image: post.cover_image_url || DEFAULT_OG_IMAGE,
              tags: post.tags || undefined,
            }),
            ...(post.reading_time_minutes ? { timeRequired: `PT${post.reading_time_minutes}M` } : {}),
          })}</script>
        )}
      </Helmet>

      <Header />

      <ArticleView
        post={post}
        html={processed.html}
        toc={processed.toc}
        words={processed.words}
        related={relatedPosts}
        newer={neighboursQuery.data?.newer ?? null}
        older={neighboursQuery.data?.older ?? null}
      />

      <Footer />
      <BackToTop />
    </div>
  );
};

export default BlogPostPage;
