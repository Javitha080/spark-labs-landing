// react-doctor-disable no-giant-component
import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { logError } from "@/lib/errors";
import { sanitizeSlug } from "@/lib/sanitize";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, User, Clock, Cpu, BookOpen, Quote, AlertCircle
} from "lucide-react";
import { scrollToTop } from "@/lib/scroll";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TableOfContents, { MobileTableOfContents } from "@/components/blog/TableOfContents";
import { FloatingReadingButton, HeaderReadingPreferences, useReadingPreferences } from "@/components/blog/ReadingPreferences";
import { BlogGuide } from "@/components/blog/BlogGuide";
import PostShare from "@/components/blog/PostShare";
import BackToTop from "@/components/blog/BackToTop";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { trackBlogView } from "@/lib/blogAnalytics";
import { blogPostingJsonLd } from "@/lib/structuredData";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/common/OptimizedImage";

interface BlogPostData {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_name: string;
  author_image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  tech_stack: string[] | null;
  published_at: string | null;
  updated_at: string | null;
  reading_time_minutes: number | null;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
}

/** First letters of a name for avatar fallbacks (real name, never fabricated). */
const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "YIC";

// Reading Progress Bar Component
const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const p = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    return Math.min(100, Math.max(0, p));
  });

  useEffect(() => {
    let raf = 0;
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, progress)));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <m.div
      className="fixed top-0 left-0 right-0 h-1 bg-muted z-[149]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <m.div
        className="h-full bg-gradient-to-r from-primary to-accent"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </m.div>
  );
};

// Related Posts Component
// SpotlightCard marks these as interactive "up next" affordances - the cursor
// spotlight only wakes on hover/focus and Theme follows the site so light mode
// keeps its surface. Ember accent matches the brand; nothing glows by default.
const RelatedPosts = ({ posts, globalDark }: { posts: RelatedPost[]; globalDark: boolean }) => {
  if (posts.length === 0) return null;

  return (
    <m.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-16 pt-12 border-t border-border/50"
    >
      <div className="flex items-center gap-2 mb-8">
        <BookOpen className="size-5 text-primary" />
        <h3 className="text-xl font-bold">Related Articles</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <m.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <SpotlightCard
              theme={globalDark ? "dark" : "light"}
              spotlightColor="hsl(24 94% 55%)"
              intensity={0.08}
              borderGlow={0.25}
              softness={0.75}
              flare={false}
              grain={0}
              className="h-full"
            >
              <Link
                to={`/blog/${post.slug}`}
                className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-2xl"
              >
                {post.cover_image_url && (
                  <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                    <OptimizedImage
                      src={post.cover_image_url}
                      alt={post.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                {post.category && (
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {post.category}
                  </Badge>
                )}
                <h4 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h4>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </SpotlightCard>
          </m.div>
        ))}
      </div>
    </m.section>
  );
};

// Loading Skeleton
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
  const MOCK_POSTS: Record<string, BlogPostData> = {
    "future-robotics-sri-lanka": {
      id: "mock-1",
      title: "The Future of Robotics in Sri Lankan Schools",
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
        <p>You don't need a state-of-the-art lab to start. A simple <strong>Arduino Uno</strong> kit costs less than a textbook and opens up a world of possibilities. Check out our <a href="/blog/learning-hub">STEM Learning Hub</a> for free tutorials to get you started today.</p>

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
      // Fixed date so DEV fallback doesn't shift to "today" on every load.
      published_at: "2025-06-15T09:00:00.000Z",
      updated_at: "2025-06-15T09:00:00.000Z",
      reading_time_minutes: 5
    }
  };

// DOMPurify hardening applied once, module scope (SSR-safe guard):
//  - external <a> gets target=_blank + rel=noopener noreferrer
//  - content <img> gets loading=lazy + decoding=async (the edge HTMLRewriter
//    only touches server-rendered markup, not this client-rendered content)
let domPurifyHooked = false;
function registerDomPurifyHooks() {
  if (domPurifyHooked || typeof window === "undefined") return;
  domPurifyHooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      const external = /^https?:\/\//i.test(href) && !href.startsWith(window.location.origin);
      if (external) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
    if (node.tagName === "IMG") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
    }
  });
}

const BlogPostPage = () => {
  const { slug } = useParams();
  const [showMobilePrefs, setShowMobilePrefs] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { preferences, updatePreference, resetPreferences, getContentClasses, getThemeClass, isGlobalDark } = useReadingPreferences();

  const handleExplore = useCallback(() => {
    // Desktop: preferences are always visible in the sidebar
    // Mobile: open the bottom sheet
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      setShowMobilePrefs(true);
    }
  }, []);

  // An invalid or missing slug is derivable from the URL - no state needed.
  const slugInvalid = !slug || !sanitizeSlug(slug ?? "");

  // ─── Post data (React Query + realtime invalidation) ────────────────────────
  const postQuery = useQuery<BlogPostData>({
    queryKey: ["blog-post", slug],
    enabled: !!slug && !slugInvalid,
    retry: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async (): Promise<BlogPostData> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (data) return data as BlogPostData;
      // DEV fallback so the reading experience is demoable with no database.
      if (import.meta.env.DEV && slug && MOCK_POSTS[slug]) return MOCK_POSTS[slug];
      throw new Error("Post not found");
    },
  });

  const post = postQuery.data ?? null;
  const loading = postQuery.isLoading;

  // Keep the tab fresh when admins publish or edit while it is open.
  useRealtimeSync(["blog_posts"], {
    queryKeys: [["blog-posts"], ["blog-post"], ["blog-related"]],
  });

  useEffect(() => {
    if (!slugInvalid) scrollToTop({ immediate: true });
  }, [slug, slugInvalid]);

  // ─── Related posts ──────────────────────────────────────────────────────────
  const relatedQuery = useQuery<RelatedPost[]>({
    queryKey: ["blog-related", post?.id ?? "none"],
    enabled: !!post && !!(post.category || (post.tags?.length ?? 0) > 0),
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<RelatedPost[]> => {
      if (!post) return [];
      const conditions: string[] = [];
      if (post.category) conditions.push(`category.eq.${post.category}`);
      if (post.tags?.length) conditions.push(...post.tags.map(t => `tags.cs.{${t}}`));
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, category")
        .eq("status", "published")
        .neq("id", post.id)
        .or(conditions.join(","))
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });
  const relatedPosts = relatedQuery.data ?? [];

  // One honest view event per browser session per post.
  const postId = post?.id;
  useEffect(() => {
    if (postId && slug) trackBlogView(slug);
  }, [postId, slug]);

  // ─── Content processing ─────────────────────────────────────────────────────
  registerDomPurifyHooks();

  const processContent = (content: string) => {
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span', 'div', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class']
    });

    let headingIndex = 0;
    return sanitized.replace(/<(h[1-6])([^>]*)>/gi, (match, tag, attrs) => {
      const id = `heading-${headingIndex++}`;
      return `<${tag}${attrs} id="${id}">`;
    });
  };
  const processedContent = post ? processContent(post.content) : "";

  // Append a copy button to every code block after each content render.
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !processedContent) return;

    const copyCode = async (pre: HTMLPreElement, btn: HTMLButtonElement) => {
      const text = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
        btn.classList.add("code-copy-btn--done");
        toast.success("Code copied");
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("code-copy-btn--done");
        }, 1600);
      } catch {
        toast.error("Could not copy code");
      }
    };

    for (const pre of Array.from(container.querySelectorAll("pre"))) {
      if (pre.querySelector(".code-copy-btn")) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-btn";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      btn.addEventListener("click", () => void copyCode(pre, btn));
      pre.appendChild(btn);
    }
  }, [processedContent]);

  // Delegated click for the image lightbox (linked images keep following links).
  const onContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const img = target.closest("img");
    if (!img || img.closest("a")) return;
    const src = img.getAttribute("src");
    if (!src) return;
    e.preventDefault();
    setLightbox({ src, alt: img.getAttribute("alt") || "" });
  }, []);

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
      <ReadingProgressBar />
      <Header />

      <main className="pt-24 pb-16">
        {/* Hero Image */}
        {post.cover_image_url && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative h-[30vh] sm:h-[40vh] md:h-[50vh] lg:h-[60vh] mb-6 sm:mb-8 md:mb-12"
          >
            <OptimizedImage
              src={post.cover_image_url}
              alt={post.title}
              className="size-full object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </m.div>
        )}

        <div className="container-custom">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Main Content */}
            <m.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 max-w-3xl"
            >
              {/* Back / Preferences / Share toolbar */}
              <div className="flex items-center justify-between mb-6">
                <Link to="/blog">
                  <Button variant="ghost" className="gap-2">
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline">Back to Blog</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <div className="hidden md:block">
                    <HeaderReadingPreferences
                      preferences={preferences}
                      updatePreference={updatePreference}
                      resetPreferences={resetPreferences}
                      isGlobalDark={isGlobalDark}
                    />
                  </div>
                  <PostShare
                    variant="menu"
                    slug={slug ?? ""}
                    title={post.title}
                    description={post.excerpt}
                  />
                </div>
              </div>

              {/* Category chip doubles as a filter link into the listing */}
              {post.category && (
                <Link
                  to={`/blog?category=${encodeURIComponent(post.category)}`}
                  className="inline-block mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full"
                >
                  <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30 transition-colors">
                    {post.category}
                  </Badge>
                </Link>
              )}

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight [text-wrap:balance]">
                {post.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {post.author_image_url ? (
                    <OptimizedImage
                      src={post.author_image_url}
                      alt={post.author_name}
                      width={40}
                      height={40}
                      className="size-10 min-w-[2.5rem] min-h-[2.5rem] max-w-[2.5rem] max-h-[2.5rem] rounded-full object-cover border-2 border-primary/20 shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-display font-bold text-sm">{initialsOf(post.author_name)}</span>
                    </div>
                  )}
                  <span className="font-medium text-foreground">{post.author_name}</span>
                </div>
                {post.published_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <time dateTime={post.published_at}>
                      {format(new Date(post.published_at), "MMMM d, yyyy")}
                    </time>
                  </div>
                )}
                {post.reading_time_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    <span>{post.reading_time_minutes} min read</span>
                  </div>
                )}
              </div>

              {/* Excerpt as a labelled standfirst */}
              {post.excerpt && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/50 mb-6 sm:mb-8"
                >
                  <div className="flex items-start gap-3">
                    <Quote className="size-5 text-primary shrink-0 mt-1" aria-hidden="true" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">Summary</p>
                      <p className="text-base sm:text-lg text-muted-foreground italic leading-relaxed [text-wrap:pretty]">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>
                </m.div>
              )}

              {/* Tech Stack */}
              {post.tech_stack && post.tech_stack.length > 0 && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 mb-8">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <Cpu className="size-4 text-primary" />
                    Tech Stack / Tools Used
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tech_stack.map(tech => (
                      <Badge key={tech} variant="secondary" className="bg-primary/10">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags - each jumps into the listing pre-filtered */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
                  {post.tags.map(tag => (
                    <Link
                      key={tag}
                      to={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full"
                    >
                      <Badge variant="outline" className="text-xs hover:bg-primary/10 transition-colors">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {/* Article body */}
              <div
                ref={contentRef}
                onClick={onContentClick}
                className={cn(
                  "blog-content-enhanced",
                  getContentClasses(),
                  getThemeClass() && `reading-area-themed ${getThemeClass()}`
                )}
                // react-doctor-disable no-danger
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />

              {/* Reading footer: share + author */}
              <div id="content-end-boundary" className="mt-12 pt-8 border-t border-border/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">Share this article</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Know a student who'd enjoy this? Pass it along.
                    </p>
                  </div>
                  <PostShare
                    variant="inline"
                    slug={slug ?? ""}
                    title={post.title}
                    description={post.excerpt}
                  />
                </div>

                <div className="mt-8 flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/20 p-5">
                  {post.author_image_url ? (
                    <OptimizedImage
                      src={post.author_image_url}
                      alt={post.author_name}
                      width={48}
                      height={48}
                      className="size-12 rounded-full object-cover border-2 border-primary/20 shrink-0"
                    />
                  ) : (
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-display font-bold">{initialsOf(post.author_name)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Written by</p>
                    <p className="font-semibold text-foreground leading-snug">{post.author_name}</p>
                    <p className="text-sm text-muted-foreground">{SITE_NAME}</p>
                  </div>
                </div>
              </div>

              {/* Related Posts */}
              <RelatedPosts posts={relatedPosts} globalDark={isGlobalDark} />
            </m.article>

            {/* Sidebar TOC */}
            <aside className="hidden md:block w-72 shrink-0">
              <TableOfContents content={post.content} />
            </aside>
          </div>
        </div>
      </main>

      <Footer />
      <BackToTop />
      <MobileTableOfContents content={post.content} />
      <FloatingReadingButton
        preferences={preferences}
        updatePreference={updatePreference}
        resetPreferences={resetPreferences}
        open={showMobilePrefs}
        onOpenChange={setShowMobilePrefs}
        isGlobalDark={isGlobalDark}
      />
      <BlogGuide onExplore={handleExplore} />

      {/* Content image lightbox (Esc / backdrop close built into Dialog) */}
      <Dialog open={!!lightbox} onOpenChange={(open) => { if (!open) setLightbox(null); }}>
        <DialogContent className="max-w-5xl border-border/50 bg-background/95 p-3 sm:p-4 backdrop-blur-xl">
          <DialogTitle className="sr-only">{lightbox?.alt || "Article image"}</DialogTitle>
          {lightbox && (
            <figure className="space-y-3">
              <img
                src={lightbox.src}
                alt={lightbox.alt}
                className="max-h-[78vh] w-full rounded-xl object-contain bg-muted/40"
              />
              {lightbox.alt && (
                <figcaption className="text-sm text-muted-foreground text-center [text-wrap:balance]">
                  {lightbox.alt}
                </figcaption>
              )}
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogPostPage;
