import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Sparkles, Zap, Globe, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/blog/BlogCard";
import BlogEmptyState from "@/components/blog/BlogEmptyState";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchPosts();
    window.scrollTo(0, 0);
  }, []);

  const fetchPosts = async () => {
    try {
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

      const tags = new Set<string>();
      mappedPosts.forEach(post => {
        post.tags?.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = !selectedTag || post.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Initializing Laboratory Archives...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Header />

      <main className="relative pt-32 pb-32 overflow-hidden">
        {/* Abstract Background Orbs */}
        <div className="absolute top-0 left-0 w-full h-[500px] -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-[10%] w-[30rem] h-[30rem] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 right-[10%] w-[25rem] h-[25rem] bg-accent/20 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="container-custom">
          {/* Enhanced Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-foreground/70">Club Chronicles & Innovations</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl md:text-8xl font-black mb-8 tracking-tighter"
            >
              Innovation <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent italic">Laboratory</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium"
            >
              Documenting the journey of young inventors pushing <br className="hidden md:block" />
              the boundaries of STEM, Robotics, and Sustainable Tech.
            </motion.p>
          </div>

          {/* Advanced Search & Multi-Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-5xl mx-auto mb-16 space-y-8"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-accent/50 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-50" />
              <div className="relative flex items-center bg-muted/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-border/50 dark:border-white/10 rounded-[2rem] p-2 pr-4 shadow-2xl">
                <div className="p-3 ml-2 rounded-2xl bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <Input
                  placeholder="Search scientific methodology, keywords, or projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 focus-visible:ring-0 text-lg h-14 w-full placeholder:text-muted-foreground/50"
                />
                <div className="hidden md:flex items-center gap-2 ml-4 px-4 border-l border-white/10">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filters</span>
                </div>
              </div>
            </div>

            {/* Tag Cloud with Glass Effect */}
            <div className="flex flex-wrap justify-center gap-3">
              <Badge
                onClick={() => setSelectedTag(null)}
                className={cn(
                  "cursor-pointer px-6 py-2 rounded-2xl transition-all duration-300 font-bold text-[10px] tracking-widest uppercase border",
                  selectedTag === null
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20"
                )}
              >
                All Explorations
              </Badge>
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={cn(
                    "cursor-pointer px-6 py-2 rounded-2xl transition-all duration-300 font-bold text-[10px] tracking-widest uppercase border",
                    selectedTag === tag
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                      : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </motion.div>

          {/* Bento Grid Layout */}
          <AnimatePresence mode="popLayout">
            {filteredPosts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-20"
              >
                <BlogEmptyState />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8"
              >
                {filteredPosts.map((post, index) => {
                  // Determine grid sizing for Bento effect
                  let span = "lg:col-span-4";
                  if (post.is_featured) span = "lg:col-span-12";
                  else if (index % 5 === 0) span = "lg:col-span-8";
                  else if (index % 3 === 0) span = "lg:col-span-4";

                  return (
                    <div key={post.id} className={cn("h-full", span)}>
                      <BlogCard post={post} index={index} featured={post.is_featured} />
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scientific Quote / Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-40 text-center space-y-12"
          >
            <div className="h-px w-20 bg-primary/50 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto px-8 py-16 rounded-[3rem] bg-muted/50 dark:bg-zinc-950/50 border border-border/30 dark:border-white/5">
              <div className="space-y-4">
                <BookOpen className="w-8 h-8 text-primary mx-auto" />
                <h4 className="text-sm font-black uppercase tracking-widest">Scientific Rigor</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">All projects documented here follow strict observational and experimental standards.</p>
              </div>
              <div className="space-y-4">
                <Zap className="w-8 h-8 text-secondary mx-auto" />
                <h4 className="text-sm font-black uppercase tracking-widest">Rapid Prototyping</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">We focus on iterative development, turning theories into functional prototypes quickly.</p>
              </div>
              <div className="space-y-4">
                <Globe className="w-8 h-8 text-accent mx-auto" />
                <h4 className="text-sm font-black uppercase tracking-widest">Global Outreach</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Connecting our young innovators with mentors and stakeholders worldwide.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer hideNewsletter={true} />
    </div>
  );
};

export default Blog;

