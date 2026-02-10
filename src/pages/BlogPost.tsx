import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, User, Clock, Cpu, Share2, Copy, Check,
  Twitter, Linkedin, Facebook, BookOpen, Sparkles, AlertCircle
} from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TableOfContents, { MobileTableOfContents, useHeadings } from "@/components/blog/TableOfContents";
import { ReadingPreferencesPanel, FloatingReadingButton, useReadingPreferences } from "@/components/blog/ReadingPreferences";
import { BlogGuide } from "@/components/blog/BlogGuide";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BlogPost {
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

// Reading Progress Bar Component
const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-muted z-[149]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-primary via-secondary to-accent"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  );
};

// Share Button Component
const ShareButton = ({ post }: { post: BlogPost }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;
  const shareTitle = post.title;
  const shareText = post.excerpt || `Check out this article: ${post.title}`;

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [shareUrl]);

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyToClipboard} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={shareToTwitter} className="gap-2 cursor-pointer">
          <Twitter className="h-4 w-4" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToLinkedIn} className="gap-2 cursor-pointer">
          <Linkedin className="h-4 w-4" />
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToFacebook} className="gap-2 cursor-pointer">
          <Facebook className="h-4 w-4" />
          Share on Facebook
        </DropdownMenuItem>
        {navigator.share && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={nativeShare} className="gap-2 cursor-pointer">
              <Share2 className="h-4 w-4" />
              More Options...
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Related Posts Component
const RelatedPosts = ({ posts }: { posts: RelatedPost[] }) => {
  if (posts.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-16 pt-12 border-t border-border/50"
    >
      <div className="flex items-center gap-2 mb-8">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">Related Articles</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={`/blog/${post.slug}`}
              className="group block p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300"
            >
              {post.cover_image_url && (
                <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
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
          </motion.div>
        ))}
      </div>
    </motion.section>
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
              <Skeleton className="h-10 w-10 rounded-full" />
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

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDesktopPrefs, setShowDesktopPrefs] = useState(false);
  const [showMobilePrefs, setShowMobilePrefs] = useState(false);

  const { preferences, updatePreference, resetPreferences, getContentClasses, getThemeClass, isGlobalDark } = useReadingPreferences();

  const handleExplore = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setShowDesktopPrefs(true);
    } else {
      setShowMobilePrefs(true);
    }
  }, []);

  useEffect(() => {
    if (slug) {
      fetchPost();
      window.scrollTo(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);






  // Mock Data for Fallback/Demo
  const MOCK_POSTS: Record<string, BlogPost> = {
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
        <p>You don't need a state-of-the-art lab to start. A simple <strong>Arduino Uno</strong> kit costs less than a textbook and opens up a world of possibilities. Check out our <a href="/blog/stem-learning-hub">STEM Learning Hub</a> for free tutorials to get you started today.</p>

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
      published_at: new Date().toISOString(),
      reading_time_minutes: 5
    }
  };

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Try Supabase
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (data) {
        setPost(data);
        fetchRelated(data);
      } else {
        // 2. Fallback to Mock Data
        console.log("Post not found in DB, checking mock data...");
        if (slug && MOCK_POSTS[slug]) {
          const mockPost = MOCK_POSTS[slug];
          setPost(mockPost);
          // Simulate related posts for mock
          setRelatedPosts([]);
        } else {
          throw new Error("Post not found");
        }
      }

    } catch (err) {
      const error = err as Error;
      console.error("Error fetching blog post:", error);
      setError(error.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async (currentPost: BlogPost) => {
    if (currentPost.category || (currentPost.tags && currentPost.tags.length > 0)) {
      const { data: related } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, category")
        .eq("status", "published")
        .neq("id", currentPost.id)
        .or(
          currentPost.category
            ? `category.eq.${currentPost.category}`
            : currentPost.tags?.map(t => `tags.cs.{${t}}`).join(',') || ''
        )
        .limit(3);

      setRelatedPosts(related || []);
    }
  };

  // Add IDs to headings for TOC navigation
  const processContent = (content: string) => {
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span', 'div', 'hr'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class']
    });

    let headingIndex = 0;
    return sanitized.replace(/<(h[1-6])([^>]*)>/gi, (match, tag, attrs) => {
      const id = `heading-${headingIndex++}`;
      return `<${tag}${attrs} id="${id}">`;
    });
  };

  if (loading) return <BlogPostSkeleton />;

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto px-4"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {error === "Post not found" ? "Post Not Found" : "Something Went Wrong"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {error === "Post not found"
                ? "The blog post you're looking for doesn't exist or may have been removed."
                : "We encountered an error loading this post. Please try again."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/blog">
                <Button className="btn-glow w-full sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>
              {error !== "Post not found" && (
                <Button variant="outline" onClick={fetchPost}>
                  Try Again
                </Button>
              )}
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-background transition-colors duration-500",
      getThemeClass()
    )}>
      <ReadingProgressBar />
      <Header />

      <main className="pt-24 pb-16">
        {/* Hero Image */}
        {post.cover_image_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative h-[30vh] sm:h-[40vh] md:h-[50vh] lg:h-[60vh] mb-6 sm:mb-8 md:mb-12"
          >
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </motion.div>
        )}

        <div className="container-custom">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Main Content */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 max-w-3xl"
            >
              {/* Back Button & Share */}
              <div className="flex items-center justify-between mb-6">
                <Link to="/blog">
                  <Button variant="ghost" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Blog</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <ReadingPreferencesPanel
                    preferences={preferences}
                    updatePreference={updatePreference}
                    resetPreferences={resetPreferences}
                    open={showDesktopPrefs}
                    onOpenChange={setShowDesktopPrefs}
                    isGlobalDark={isGlobalDark}
                  />
                  <ShareButton post={post} />
                </div>
              </div>

              {/* Category Badge */}
              {post.category && (
                <Badge className="mb-4 bg-primary/20 text-primary border-primary/20">
                  {post.category}
                </Badge>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
                {post.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {post.author_image_url ? (
                    <img
                      src={post.author_image_url}
                      alt={post.author_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <span className="font-medium text-foreground">{post.author_name}</span>
                </div>
                {post.published_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(post.published_at), "MMMM dd, yyyy")}</span>
                  </div>
                )}
                {post.reading_time_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{post.reading_time_minutes} min read</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
                  {post.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs hover:bg-primary/10 transition-colors cursor-default"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Excerpt */}
              {post.excerpt && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 sm:p-6 rounded-2xl bg-muted/30 border border-border/50 mb-8"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-base sm:text-lg text-muted-foreground italic leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Tech Stack */}
              {post.tech_stack && post.tech_stack.length > 0 && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 mb-8">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <Cpu className="h-4 w-4 text-primary" />
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

              {/* Content with Reading Preferences */}
              <div
                className={cn(
                  "blog-content-enhanced",
                  getContentClasses()
                )}
                dangerouslySetInnerHTML={{ __html: processContent(post.content) }}
              />

              {/* Bottom Share */}
              <div className="mt-12 pt-8 border-t border-border/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-muted-foreground">
                    Enjoyed this article? Share it with others!
                  </p>
                  <ShareButton post={post} />
                </div>
              </div>

              {/* Related Posts */}
              <RelatedPosts posts={relatedPosts} />
            </motion.article>

            {/* Sidebar TOC */}
            <aside className="hidden lg:block w-72 shrink-0">
              <TableOfContents content={post.content} />
            </aside>
          </div>
        </div>
      </main>

      <Footer />
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
    </div>
  );
};

export default BlogPostPage;
