import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author_name: string;
  author_image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading size="lg" className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container-custom section-padding">
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 gradient-text">
            Our Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Insights, updates, and stories from our innovation journey
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No blog posts available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Card className="h-full glass-card glow-border hover:shadow-purple-glow transition-all duration-300 overflow-hidden">
                  {post.cover_image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                    </div>
                  )}
                  <CardHeader>
                    {post.category && (
                      <Badge variant="secondary" className="w-fit mb-2">
                        {post.category}
                      </Badge>
                    )}
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{post.author_name}</span>
                      </div>
                      {post.published_at && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(post.published_at), "MMM dd, yyyy")}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-4 transition-all">
                      Read More <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
