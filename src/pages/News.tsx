// react-doctor-disable no-giant-component
import { useEffect, useMemo, useState, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { m, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Radio,
  Search,
  ArrowRight,
  SlidersHorizontal,
  X,
  BookOpen,
  RadioTower,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/common/OptimizedImage";
import { cn } from "@/lib/utils";
import { useSafeSearch } from "@/hooks/useSafeSearch";
import { isNewsCategory } from "@/lib/newsCategory";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShinyText from "@/components/reactbits/ShinyText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import LogoLoop from "@/components/reactbits/LogoLoop";
import StarBorder from "@/components/reactbits/StarBorder";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author_name: string;
  author_image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  is_featured: boolean;
}

/** Debounce hook (mirrors the copy in Blog.tsx). */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const NewsCardSkeleton = () => (
  <div className="h-full rounded-2xl sm:rounded-3xl border border-border/50 bg-muted/20 overflow-hidden">
    <div className="flex items-start justify-between px-5 py-4 sm:px-6 border-b border-border/30">
      <Skeleton className="h-9 w-20" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <div className="p-5 sm:p-6 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

/** Typographic, wire-forward card: big mono dateline, no image pressure. */
const NewsCard = ({ post, index }: { post: NewsPost; index: number }) => {
  const date = post.published_at ? new Date(post.published_at) : null;

  return (
    <m.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(index % 3, 2) * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Link
        to={`/blog/${post.slug}`}
        role="article"
        aria-label={`Read news: ${post.title}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-background/40 backdrop-blur-[50px] backdrop-saturate-[180%] shadow-2xl transition-all duration-500 hover:border-primary/30 hover:shadow-primary/10"
      >
        {/* Dateline row */}
        <div className="flex items-start justify-between gap-3 border-b border-white/5 bg-white/[0.02] px-5 py-4 sm:px-6">
          <div className="flex items-baseline gap-2 font-mono">
            {date ? (
              <>
                <span className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground/90">
                  {format(date, "dd")}
                </span>
                <span className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 leading-tight">
                  <span>{format(date, "MMM")}</span>
                  <span>{format(date, "yyyy")}</span>
                </span>
              </>
            ) : (
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                Unpublished
              </span>
            )}
          </div>
          {post.category && (
            <Badge className="shrink-0 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em]">
              {post.category}
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
          <h3 className="font-display font-black text-xl sm:text-2xl leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {post.excerpt}
            </p>
          )}

          {/* Meta footer */}
          <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3 text-[10px] sm:text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-2 min-w-0">
              <span className="size-7 shrink-0 rounded-full overflow-hidden border border-white/10 bg-primary/10">
                {post.author_image_url ? (
                  <OptimizedImage src={post.author_image_url} alt={post.author_name} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-primary text-[10px]">YIC</span>
                )}
              </span>
              <span className="truncate">{post.author_name}</span>
            </span>
            <span className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {post.reading_time_minutes ? (
                <span className="hidden sm:inline">{post.reading_time_minutes} min</span>
              ) : null}
              <span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 transition-all duration-500 group-hover:bg-primary group-hover:border-primary/50">
                <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-0.5" />
              </span>
            </span>
          </div>
        </div>
      </Link>
    </m.article>
  );
};

/** Lead story inside a ReactBits StarBorder frame. */
const NewsSpotlight = ({ post, themeKey }: { post: NewsPost; themeKey: "dark" | "light" }) => {
  const date = post.published_at ? new Date(post.published_at) : null;

  return (
    <m.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Featured news"
    >
      {/* StarBorder's canvas bleeds past the frame, so keep clipping off */}
      <StarBorder
        as="div"
        radius={30}
        thickness={1.25}
        stars={2}
        glow={0.8}
        theme={themeKey}
        className="w-full"
        style={{ backgroundColor: "transparent" }}
      >
        <Link
          to={`/blog/${post.slug}`}
          aria-label={`Read featured news: ${post.title}`}
          className="group relative flex w-full flex-col overflow-hidden rounded-3xl lg:flex-row"
        >
          {/* Cover */}
          <div className="relative min-h-[240px] flex-1 overflow-hidden bg-muted/30 lg:order-2">
            {post.cover_image_url ? (
              <OptimizedImage
                src={post.cover_image_url}
                alt={post.title}
                className="size-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
            ) : (
              <div className="size-full bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t via-background/30 from-background/95 to-background/20 lg:bg-gradient-to-l lg:via-background/30 lg:to-background/95" />
          </div>

          {/* Text side */}
          <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:p-10 lg:order-1 lg:p-12">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-accent/20 text-accent border-accent/20 py-1 px-4 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="size-3 mr-1.5" /> Spotlight
              </Badge>
              {post.category && (
                <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 py-1 px-4 text-xs font-bold uppercase tracking-wider">
                  {post.category}
                </Badge>
              )}
            </div>

            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary/90">
              {date ? format(date, "EEE · dd MMM yyyy") : "Latest transmission"}
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-[1.05] group-hover:text-primary transition-colors duration-300">
              {post.title}
            </h2>

            {post.excerpt && (
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {post.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-2 text-[10px] sm:text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-2 min-w-0">
                <span className="size-8 shrink-0 rounded-full overflow-hidden border border-white/10 bg-primary/10">
                  {post.author_image_url ? (
                    <OptimizedImage src={post.author_image_url} alt={post.author_name} className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-primary text-[10px]">YIC</span>
                  )}
                </span>
                <span className="truncate">{post.author_name}</span>
              </span>
              {post.reading_time_minutes ? <span className="flex items-center gap-1.5">{post.reading_time_minutes} min read</span> : null}
              <span className="inline-flex items-center gap-1.5 text-primary font-bold uppercase tracking-widest">
                Read transmission
                <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </StarBorder>
    </m.section>
  );
};

const NewsEmptyState = ({ filtered, onClear }: { filtered: boolean; onClear?: () => void }) => (
  <m.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-20 px-4 text-center"
  >
    <div className="relative size-20 mb-6">
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
      <div className="relative grid size-20 place-items-center rounded-3xl border border-border/50 bg-muted/40 backdrop-blur">
        <RadioTower className="size-9 text-primary" />
      </div>
    </div>
    <h3 className="font-display text-2xl font-black tracking-tight mb-2">
      <span className="text-primary">{filtered ? "No Matching Signals" : "No Transmissions Yet"}</span>
    </h3>
    <p className="text-muted-foreground max-w-md mb-6 text-sm leading-relaxed">
      {filtered
        ? "Nothing on the wire matches your filters. Try a different search or clear them all."
        : "The newsroom is quiet — no announcements have been broadcast so far. A new signal is coming soon."}
    </p>
    {filtered && onClear ? (
      <Button variant="outline" onClick={onClear}>
        Clear filters
      </Button>
    ) : (
      <Button variant="outline" asChild className="gap-2">
        <Link to="/blog">
          <BookOpen className="size-4" />
          Read the Blog
        </Link>
      </Button>
    )}
  </m.div>
);

const News = () => {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";
  const themeKey: "dark" | "light" = isLightTheme ? "light" : "dark";

  const { raw: searchQuery, sanitized: cleanSearch, setRaw: setSearchQuery } = useSafeSearch("", { maxLength: 80, lowercase: true });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const debouncedSearch = useDebounce(cleanSearch, 300);

  // Same read ladder as the blog page: edge-cached worker endpoint first,
  // direct Supabase fallback, filtered down to the "News" category.
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["news-posts"],
    queryFn: async () => {
      let data: NewsPost[] | null = null;
      try {
        const { fetchCachedBlogPosts } = await import("@/lib/edgeApi");
        data = await fetchCachedBlogPosts<NewsPost>();
      } catch {
        const res = await supabase
          .from("blog_posts")
          .select("*")
          .eq("status", "published")
          .eq("category", "News")
          .order("published_at", { ascending: false });
        if (res.error) throw res.error;
        data = res.data;
      }

      return (data || [])
        .filter((post) => isNewsCategory(post.category))
        .map((post) => ({
          ...post,
          reading_time_minutes: post.reading_time_minutes || null,
          is_featured: post.is_featured || false,
        }));
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  useRealtimeSync(["blog_posts"], { queryKeys: [["news-posts"]] });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const allTags = useMemo(() => {
    if (posts.length === 0) return [];
    const tags = new Set<string>();
    posts.forEach((post) => post.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [posts]);

  // Lead story only holds the spotlight when the page is unfiltered; while
  // searching/filtering, every match (itself included) lists below.
  const featured = useMemo(
    () => posts.find((post) => post.is_featured) ?? posts[0],
    [posts]
  );
  const rest = useMemo(
    () => posts.filter((post) => post.id !== featured?.id),
    [posts, featured]
  );

  const filteredPosts = useMemo(() => {
    let result = posts.filter((post) => {
      const matchesSearch =
        !debouncedSearch ||
        post.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesTag = !selectedTag || post.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });

    if (sortBy === "oldest") {
      result = result.toSorted(
        (a, b) =>
          new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime()
      );
    }

    return result;
  }, [posts, debouncedSearch, selectedTag, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedTag(null);
    setSortBy("newest");
  }, [setSearchQuery]);

  const hasActiveFilters = Boolean(searchQuery || selectedTag || sortBy !== "newest");

  const tickerItems = useMemo(
    () =>
      posts.slice(0, 10).map((post) => ({
        node: (
          <Link
            to={`/blog/${post.slug}`}
            title={post.title}
            className="group inline-flex items-center gap-3 whitespace-nowrap transition-colors hover:opacity-90"
          >
            <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary/80" aria-hidden="true" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary/80">
              {post.published_at ? format(new Date(post.published_at), "dd MMM") : "DRAFT"}
            </span>
            <span className="text-xs sm:text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
              {post.title}
            </span>
          </Link>
        ),
        title: post.title,
      })),
    [posts]
  );

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Newsroom — Young Innovators Club",
      url: `${SITE_URL}/news`,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      ...(posts.length > 0 && {
        mainEntity: {
          "@type": "ItemList",
          itemListElement: posts.slice(0, 10).map((post, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: post.title,
            url: `${SITE_URL}/blog/${post.slug}`,
            datePublished: post.published_at ?? undefined,
          })),
        },
      }),
    }),
    [posts]
  );

  // Full page loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="relative pt-32 pb-32">
          <div className="container-custom px-4 sm:px-6">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Skeleton className="h-8 w-48 mx-auto mb-6" />
              <Skeleton className="h-16 w-full max-w-2xl mx-auto mb-4" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
            </div>
            <Skeleton className="h-12 w-full mb-16 rounded-xl" />
            <Skeleton className="min-h-[380px] w-full mb-12 rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              <NewsCardSkeleton />
              <NewsCardSkeleton />
              <NewsCardSkeleton />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <SEOHead
        title="Newsroom - Latest Club Updates | Young Innovators Club"
        description="Live announcements, competition results and event coverage from Dharmapala Vidyalaya's Young Innovators Club."
        path="/news"
        structuredData={structuredData}
      />
      <Header />

      <main className="relative pt-28 sm:pt-32 pb-24 sm:pb-32 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-0 left-0 w-full h-[500px] -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-20 right-[10%] size-[20rem] sm:size-[30rem] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 left-[10%] size-[15rem] sm:size-[25rem] bg-accent/20 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="container-custom px-4 sm:px-6">
          {/* Hero */}
          <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-14">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 sm:mb-8"
            >
              <span className="relative flex size-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex size-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full size-2 bg-primary" />
              </span>
              <Radio className="size-3.5 text-primary" aria-hidden="true" />
              <ShinyText
                text="Live from the newsroom"
                color={isLightTheme ? "#52525b" : "#b5b5b5"}
                shineColor={isLightTheme ? "#7c3aed" : "#ffffff"}
                speed={3}
                delay={1.5}
                className="text-[10px] font-black tracking-[0.2em] uppercase"
              />
            </m.div>

            <m.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-8 tracking-tighter leading-[1.1]"
            >
              <DecryptedText
                text="Breaking"
                animateOn="view"
                speed={40}
                maxIterations={8}
                className="font-black"
              />{" "}
              <span className="text-primary italic">
                <DecryptedText
                  text="Ground"
                  animateOn="view"
                  speed={40}
                  maxIterations={8}
                  sequential
                  className="font-black italic"
                />
              </span>
            </m.h1>

            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="text-base sm:text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium px-4 max-w-2xl mx-auto"
            >
              Announcements, competition results and event coverage — received{" "}
              <br className="hidden md:block" />
              live from the Young Innovators Club lab.
            </m.p>
          </div>

          {/* Wire ticker */}
          <div className="relative -mx-4 sm:-mx-6 mb-10 sm:mb-16 border-y border-border/40 bg-muted/10 dark:bg-white/[0.02]">
            <div className="flex items-stretch">
              <div className="hidden sm:flex shrink-0 items-center gap-2 px-4 border-r border-border/40 bg-muted/20">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full size-2 bg-primary" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/80">
                  Wire
                </span>
              </div>
              <div className="min-w-0 flex-1 py-2 px-2 sm:px-4" aria-label="Latest headlines ticker">
                {tickerItems.length > 0 && (
                  <LogoLoop
                    logos={tickerItems}
                    speed={90}
                    logoHeight={32}
                    gap={48}
                    intro
                    ariaLabel="Latest news headlines"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Search & filters */}
          {posts.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="max-w-5xl mx-auto mb-10 sm:mb-14 space-y-6"
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-accent/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-50" />
                <div className="relative flex items-center bg-muted/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-border/50 dark:border-white/10 rounded-2xl p-2 pr-4 shadow-2xl">
                  <div className="p-2.5 sm:p-3 ml-1 sm:ml-2 rounded-xl sm:rounded-2xl bg-primary/10">
                    <Search className="size-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" />
                  </div>
                  <Input
                    placeholder="Search transmissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-0 focus-visible:ring-0 text-sm sm:text-lg h-10 sm:h-14 w-full placeholder:text-muted-foreground/80"
                    aria-label="Search news"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 min-h-[44px] min-w-[44px]"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                  <div className="hidden md:flex items-center gap-2 ml-2 px-4 border-l border-border/50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <SlidersHorizontal className="size-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Sort</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => setSortBy("newest")}
                          className={cn(sortBy === "newest" && "bg-primary/10")}
                        >
                          Newest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSortBy("oldest")}
                          className={cn(sortBy === "oldest" && "bg-primary/10")}
                        >
                          Oldest First
                        </DropdownMenuItem>
                        {hasActiveFilters && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={clearFilters} className="text-destructive">
                              Clear All Filters
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Tag chips */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedTag && (
                    <Badge
                      onClick={() => setSelectedTag(null)}
                      className="cursor-pointer px-4 py-1.5 rounded-full bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30 transition-all gap-1"
                    >
                      <X className="size-3" />
                      Clear: {selectedTag}
                    </Badge>
                  )}
                  {allTags.slice(0, 10).map((tag) => (
                    <Badge
                      key={tag}
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                      className={cn(
                        "cursor-pointer px-4 sm:px-6 py-2.5 min-h-[44px] inline-flex items-center rounded-full transition-all duration-300 font-semibold text-[10px] sm:text-xs tracking-wider uppercase border",
                        selectedTag === tag
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                          : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </m.div>
          )}

          {/* Spotlight */}
          {!hasActiveFilters && featured && posts.length > 0 && (
            <div className="max-w-5xl mx-auto mb-10 sm:mb-16">
              <NewsSpotlight post={featured} themeKey={themeKey} />
            </div>
          )}

          {/* Wire grid */}
          <AnimatePresence mode="popLayout">
            {(() => {
              const listing = hasActiveFilters ? filteredPosts : rest;

              if (posts.length === 0) {
                return (
                  <m.div key="empty" className="py-8">
                    <NewsEmptyState filtered={false} onClear={() => clearFilters()} />
                  </m.div>
                );
              }

              if (listing.length === 0) {
                return (
                  <m.div key="no-match" className="py-8">
                    <NewsEmptyState filtered onClear={clearFilters} />
                  </m.div>
                );
              }

              return (
                <m.div
                  key="wire-grid"
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
                >
                  {listing.map((post, index) => (
                    <m.div key={post.id} layout>
                      <NewsCard post={post} index={index} />
                    </m.div>
                  ))}
                </m.div>
              );
            })()}
          </AnimatePresence>

          {/* Deep-dive cross-link */}
          {posts.length > 0 && (
            <m.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-20 sm:mt-28 text-center space-y-8"
            >
              <div className="h-px w-20 bg-primary/50 mx-auto" />
              <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16 rounded-2xl sm:rounded-[3rem] bg-muted/50 dark:bg-zinc-950/50 border border-border/30 dark:border-white/5">
                <BookOpen className="size-6 sm:w-8 sm:h-8 text-primary mx-auto mb-4" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest mb-3">Want the full story?</h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-8">
                  Deep dives, innovator profiles and project retrospectives live on the blog — slow cinematics to our fast wire.
                </p>
                <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-[10px] font-bold uppercase tracking-[0.15em] px-6 h-10 border border-primary/20">
                  <Link to="/blog">
                    Explore the Blog
                    <ArrowRight className="size-3.5 ml-2" />
                  </Link>
                </Button>
              </div>
            </m.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default News;
