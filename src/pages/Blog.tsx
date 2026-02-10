import { useEffect, useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Sparkles, Zap, Globe, BookOpen, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/blog/BlogCard";
import BlogEmptyState from "@/components/blog/BlogEmptyState";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BlogPost {
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

const CATEGORIES = [
  "All",
  "Invention",
  "Innovator Profile",
  "News",
  "Tutorial",
  "Project Showcase",
  "Competition",
  "Research"
];

// Skeleton Card Component
const BlogCardSkeleton = ({ featured = false }: { featured?: boolean }) => (
  <div className={cn(
    "rounded-3xl border border-border/50 bg-muted/20 overflow-hidden",
    featured ? "min-h-[500px] lg:col-span-12" : "min-h-[400px]"
  )}>
    <Skeleton className="w-full h-48" />
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center gap-4 pt-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

// Loading Grid
const LoadingGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
    <div className="lg:col-span-12">
      <BlogCardSkeleton featured />
    </div>
    <div className="lg:col-span-4">
      <BlogCardSkeleton />
    </div>
    <div className="lg:col-span-4">
      <BlogCardSkeleton />
    </div>
    <div className="lg:col-span-4">
      <BlogCardSkeleton />
    </div>
  </div>
);

// Debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchPosts();
    window.scrollTo(0, 0);
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;

      const mappedPosts = (data || []).map(post => ({
        ...post,
        reading_time_minutes: post.reading_time_minutes || null,
        is_featured: post.is_featured || false,
      }));

      setPosts(mappedPosts);

      // Extract unique tags
      const tags = new Set<string>();
      mappedPosts.forEach(post => {
        post.tags?.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let result = posts.filter(post => {
      const matchesSearch = !debouncedSearch ||
        post.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        post.tags?.some(tag => tag.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
      const matchesTag = !selectedTag || post.tags?.includes(selectedTag);

      return matchesSearch && matchesCategory && matchesTag;
    });

    // Sort
    if (sortBy === "oldest") {
      result = [...result].sort((a, b) =>
        new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime()
      );
    }

    return result;
  }, [posts, debouncedSearch, selectedCategory, selectedTag, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedTag(null);
    setSortBy("newest");
  }, []);

  const hasActiveFilters = searchQuery || selectedCategory !== "All" || selectedTag || sortBy !== "newest";

  // Full page loading state
  if (loading) {
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
              <Skeleton className="h-16 w-full rounded-[2rem]" />
            </div>

            {/* Grid Skeleton */}
            <LoadingGrid />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Helmet>
        <title>Innovation Blog - Student Projects & Tech News | YIC</title>
        <meta name="description" content="Discover the latest student innovations, competition updates, and tech research from Dharmapala Vidyalaya's Young Innovators Club." />
        <link rel="canonical" href="https://yic-dharmapala.web.app/blog" />
        <meta property="og:title" content="Innovation Blog - Student Projects & Tech News | YIC" />
        <meta property="og:description" content="Discover the latest student innovations, competition updates, and tech research from Dharmapala Vidyalaya's Young Innovators Club." />
        <meta property="og:url" content="https://yic-dharmapala.web.app/blog" />
      </Helmet>
      <Header />

      <main className="relative pt-28 sm:pt-32 pb-24 sm:pb-32 overflow-hidden">
        {/* Abstract Background Orbs */}
        <div className="absolute top-0 left-0 w-full h-[500px] -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-[10%] w-[20rem] sm:w-[30rem] h-[20rem] sm:h-[30rem] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 right-[10%] w-[15rem] sm:w-[25rem] h-[15rem] sm:h-[25rem] bg-accent/20 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="container-custom px-4 sm:px-6">
          {/* Enhanced Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 sm:mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-foreground/70">Club Chronicles & Innovations</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-8 tracking-tighter leading-[1.1]"
            >
              Innovation <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent italic">Laboratory</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base sm:text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium px-4 max-w-2xl mx-auto"
            >
              Documenting the journey of young inventors pushing <br className="hidden md:block" />
              the boundaries of STEM, Robotics, and Sustainable Tech.
            </motion.p>
          </div>

          {/* Search & Filters Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-5xl mx-auto mb-8 sm:mb-12 space-y-6"
          >
            {/* Search Bar */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-accent/50 rounded-2xl sm:rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-50" />
              <div className="relative flex items-center bg-muted/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-border/50 dark:border-white/10 rounded-2xl sm:rounded-[2rem] p-2 pr-4 shadow-2xl">
                <div className="p-2.5 sm:p-3 ml-1 sm:ml-2 rounded-xl sm:rounded-2xl bg-primary/10">
                  <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 focus-visible:ring-0 text-sm sm:text-lg h-10 sm:h-14 w-full placeholder:text-muted-foreground/50"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div className="hidden md:flex items-center gap-2 ml-2 px-4 border-l border-border/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Sort & Filter</span>
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

            {/* Category Tabs */}
            <div className="relative">
              <div className="flex overflow-x-auto pb-2 -mb-2 scrollbar-hide gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300",
                      selectedCategory === category
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {selectedCategory === category && (
                      <motion.div
                        layoutId="activeCategory"
                        className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/30"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tag Cloud */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {selectedTag && (
                  <Badge
                    onClick={() => setSelectedTag(null)}
                    className="cursor-pointer px-4 py-1.5 rounded-full bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30 transition-all gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear: {selectedTag}
                  </Badge>
                )}
                {allTags.slice(0, 8).map(tag => (
                  <Badge
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={cn(
                      "cursor-pointer px-4 sm:px-6 py-1.5 sm:py-2 rounded-full transition-all duration-300 font-semibold text-[10px] sm:text-xs tracking-wider uppercase border",
                      selectedTag === tag
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
                {allTags.length > 8 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge className="cursor-pointer px-4 py-1.5 rounded-full bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted transition-all">
                        +{allTags.length - 8} more
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto">
                      {allTags.slice(8).map(tag => (
                        <DropdownMenuItem
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={cn(selectedTag === tag && "bg-primary/10")}
                        >
                          {tag}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Active Filters Summary (Mobile) */}
            {hasActiveFilters && (
              <div className="md:hidden flex items-center justify-between px-2">
                <span className="text-sm text-muted-foreground">
                  {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
                  Clear Filters
                </Button>
              </div>
            )}
          </motion.div>

          {/* Blog Grid */}
          <AnimatePresence mode="popLayout">
            {filteredPosts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-12 sm:py-20"
              >
                <BlogEmptyState />
                {hasActiveFilters && (
                  <div className="text-center mt-6">
                    <Button variant="outline" onClick={clearFilters}>
                      Clear all filters
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8"
              >
                {filteredPosts.map((post, index) => {
                  // Determine grid sizing for Bento effect
                  let span = "lg:col-span-4";
                  if (post.is_featured) span = "lg:col-span-12";
                  else if (index % 5 === 0 && !post.is_featured) span = "md:col-span-2 lg:col-span-8";
                  else if (index % 7 === 0) span = "md:col-span-1 lg:col-span-6";
                  else span = "md:col-span-1 lg:col-span-4";

                  return (
                    <motion.div
                      key={post.id}
                      className={cn("h-full", span)}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <BlogCard post={post} index={index} featured={post.is_featured} />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Count */}
          {filteredPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-12 text-sm text-muted-foreground"
            >
              Showing {filteredPosts.length} of {posts.length} articles
            </motion.div>
          )}

          {/* Scientific Quote / Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-24 sm:mt-40 text-center space-y-8 sm:space-y-12"
          >
            <div className="h-px w-20 bg-primary/50 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16 rounded-2xl sm:rounded-[3rem] bg-muted/50 dark:bg-zinc-950/50 border border-border/30 dark:border-white/5">
              <div className="space-y-3 sm:space-y-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest">Scientific Rigor</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">All projects documented here follow strict observational and experimental standards.</p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-secondary mx-auto" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest">Rapid Prototyping</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">We focus on iterative development, turning theories into functional prototypes quickly.</p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-accent mx-auto" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest">Global Outreach</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Connecting our young innovators with mentors and stakeholders worldwide.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
