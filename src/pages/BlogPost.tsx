import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Clock, Cpu } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TableOfContents, { MobileTableOfContents } from "@/components/blog/TableOfContents";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  tech_stack: string[] | null;
  published_at: string | null;
  reading_time_minutes: number | null;
}

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      setPost(data);
    } catch (error) {
      const err = error as Error;
      console.error("Error fetching blog post:", err);
    } finally {
      setLoading(false);
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

  if (loading) return <Loading size="lg" className="min-h-screen" />;

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
            <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
            <Link to="/blog">
              <Button className="btn-glow">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        {/* Hero */}
        {post.cover_image_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative h-[50vh] md:h-[60vh] mb-12"
          >
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </motion.div>
        )}

        <div className="container-custom">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Main Content */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 max-w-3xl"
            >
              <Link to="/blog">
                <Button variant="ghost" className="mb-6">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>

              {post.category && (
                <Badge className="mb-4 bg-primary/20 text-primary">{post.category}</Badge>
              )}

              <h1 className="text-3xl md:text-5xl font-bold mb-6 gradient-text">{post.title}</h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 mb-8 text-muted-foreground">
                <div className="flex items-center gap-2">
                  {post.author_image_url ? (
                    <img src={post.author_image_url} alt={post.author_name} className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
                  ) : <User className="h-5 w-5" />}
                  <span className="font-medium">{post.author_name}</span>
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
                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
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
                      <Badge key={tech} variant="secondary" className="bg-primary/10">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div
                className="prose prose-lg dark:prose-invert max-w-none blog-content"
                dangerouslySetInnerHTML={{ __html: processContent(post.content) }}
              />
            </motion.article>

            {/* Sidebar TOC */}
            <aside className="hidden lg:block w-72">
              <TableOfContents content={post.content} />
            </aside>
          </div>
        </div>
      </main>

      <Footer />
      <MobileTableOfContents content={post.content} />
    </div>
  );
};

export default BlogPostPage;
