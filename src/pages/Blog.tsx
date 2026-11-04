// react-doctor-disable no-giant-component
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { m } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, Zap, Globe, BookOpen, Radio, AlertCircle, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogExplorer from "@/components/blog/BlogExplorer";
import { CountUp } from "@/components/blog/CountUp";
import BlogEmptyState from "@/components/blog/BlogEmptyState";
import SplitText from "@/components/reactbits/SplitText";
import type { PostSummary, SortKey } from "@/lib/blogTypes";
import { isSortKey, cleanAuthor } from "@/lib/blogTypes";
import { isNewsCategory } from "@/lib/newsCategory";

// "News"-category posts live on the dedicated /news page (News.tsx).
const CATEGORIES = [
  "Invention",
  "Innovator Profile",
  "Tutorial",
  "Project Showcase",
  "Competition",
  "Research",
];

// Loading placeholder shaped like the real listing (featured card + 3-col grid)
const LoadingGrid = () => (
  <div className="mx-auto mt-12 max-w-7xl">
    <div className="mb-8 overflow-hidden rounded-[2rem] rs-surface">
      <Skeleton className="h-64 w-full sm:h-80" />
    </div>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-3xl rs-surface">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Blog = () => {
  const [searchParams] = useSearchParams();

  // Deep links from article chips: /blog?q=&category=Tutorial&tag=Arduino&sort=popular
  const paramCategory = searchParams.get("category");
  const paramTag = searchParams.get("tag");
  const paramSort = searchParams.get("sort");
  const initial = {
    q: searchParams.get("q")?.slice(0, 80) ?? "",
    category: paramCategory ?? "All",
    tag: paramTag ?? null,
    sort: (isSortKey(paramSort) ? paramSort : "newest") as SortKey,
  };

  // React Query for Caching & SWR.
  // Try the edge-cached endpoint (D1 → CF → Supabase) first; fall back to a
  // direct Supabase query if the worker is unreachable (e.g. local preview).
  const { data: posts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async (): Promise<PostSummary[]> => {
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

      return (data || []).map((raw) => {
        const post = raw as Omit<PostSummary, "views"> & { views?: number };
        return {
          ...post,
          author_name: cleanAuthor(post.author_name),
          views: post.views ?? 0,
          tags: post.tags ?? null,
          reading_time_minutes: post.reading_time_minutes ?? null,
          is_featured: post.is_featured ?? false,
        } as PostSummary;
      }).filter(post => !isNewsCategory(post.category));
    },
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  useRealtimeSync(["blog_posts"], { queryKeys: [["blog-posts"]] });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Full page loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="relative pt-32 pb-32">
          <div className="container-custom">
            {/* Hero Skeleton */}
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Skeleton className="h-8 w-48 mx-auto mb-6" />
              <Skeleton className="h-16 w-full max-w-2xl mx-auto mb-4" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
            </div>

            {/* Search Skeleton */}
            <div className="max-w-5xl mx-auto mb-12">
              <Skeleton className="h-16 w-full rounded-full" />
            </div>

            {/* Grid Skeleton */}
            <LoadingGrid />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state - the network failed and nothing is cached.
  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="min-h-[60vh] pt-32 pb-32 flex items-center justify-center">
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto px-4"
          >
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">Couldn't load the articles</h1>
            <p className="text-muted-foreground mb-8">
              The connection to the article feed failed. Check your network and try again.
            </p>
            <Button onClick={() => refetch()} className="gap-2">
              <RotateCcw className="size-4" />
              Try Again
            </Button>
          </m.div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalViews = posts.reduce((sum, p) => sum + p.views, 0);

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <SEOHead
        title="Innovation Blog - Student Projects & Research | Young Innovators Club"
        description="Discover the latest student innovations, competition updates, and tech research from Dharmapala Vidyalaya's Young Innovators Club."
        path="/blog"
      />
      <Header />

      <main className="relative pt-28 sm:pt-32 pb-24 sm:pb-32 overflow-hidden">
        {/* Abstract Background Orbs */}
        <div className="absolute top-0 left-0 w-full h-[500px] -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-[10%] size-[20rem] sm:size-[30rem] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 right-[10%] size-[15rem] sm:size-[25rem] bg-accent/20 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="container-custom px-4 sm:px-6">
          {/* Enhanced Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-14">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 sm:mb-8"
            >
              <Sparkles className="size-4 text-primary" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-foreground/70">Club Chronicles & Innovations</span>
            </m.div>

            {/* Identity headline: one entrance beat, then stillness. SplitText
                staggers the two words once on load and holds still; it also
                renders the final state immediately under reduced motion. */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-8 tracking-tighter leading-[1.1]">
              <SplitText
                text="Innovation"
                tag="span"
                className="inline-block"
                effect="rise"
                splitType="chars"
                staggerFrom="start"
                delay={26}
                duration={700}
                trigger="load"
              />
              <br className="hidden sm:block" />
              <SplitText
                text="Laboratory"
                tag="span"
                className="inline-block text-primary italic"
                effect="rise"
                splitType="chars"
                staggerFrom="start"
                delay={26}
                duration={700}
                trigger="load"
              />
            </h1>

            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base sm:text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium px-4 max-w-2xl mx-auto"
            >
              Documenting the journey of young inventors pushing <br className="hidden md:block" />
              the boundaries of STEM, Robotics, and Sustainable Tech.
            </m.p>

            {/* News-room redirect: category News posts live on /news now */}
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="mt-8"
            >
              <Link
                to="/news"
                className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs sm:text-sm font-semibold text-primary/90 hover:text-primary hover:bg-primary/20 transition-colors"
              >
                <Radio className="size-3.5" />
                Announcements &amp; event updates live on the Newsroom
              </Link>
            </m.div>

            {/* Live stats trio */}
            <m.dl
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-8 flex flex-wrap items-baseline justify-center gap-x-10 gap-y-3"
            >
              {[
                { n: posts.length, label: "articles" },
                { n: new Set(posts.flatMap((p) => (p.category ? [p.category] : []))).size, label: "categories" },
                { n: totalViews, label: "reads" },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <dd className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
                    <CountUp to={s.n} />
                  </dd>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </m.dl>
          </div>
        </div>

        {/* Listing: search, category/tag chips, saved filter, sorts, grid/list */}
        {posts.length > 0 ? (
          <div className="container-custom px-0 sm:px-6">
            <BlogExplorer
              posts={posts}
              curatedCategories={CATEGORIES}
              initial={initial}
            />
          </div>
        ) : (
          <div className="container-custom py-12 sm:py-20">
            <BlogEmptyState />
          </div>
        )}

        {/* Scientific Quote / Footer Info */}
        <div className="container-custom px-4 sm:px-6">
          <m.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-20 sm:mt-32 text-center space-y-8 sm:space-y-12"
          >
            <div className="h-px w-20 bg-primary/50 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16 rounded-2xl sm:rounded-[3rem] bg-muted/50 dark:bg-zinc-950/50 border border-border/30 dark:border-white/5">
              <div className="space-y-3 sm:space-y-4">
                <BookOpen className="size-6 sm:w-8 sm:h-8 text-primary mx-auto" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest">Scientific Rigor</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">All projects documented here follow strict observational and experimental standards.</p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <Zap className="size-6 sm:w-8 sm:h-8 text-secondary mx-auto" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest">Rapid Prototyping</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">We focus on iterative development, turning theories into functional prototypes quickly.</p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <Globe className="size-6 sm:w-8 sm:h-8 text-accent mx-auto" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest">Global Outreach</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Connecting our young innovators with mentors and stakeholders worldwide.</p>
              </div>
            </div>
          </m.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
