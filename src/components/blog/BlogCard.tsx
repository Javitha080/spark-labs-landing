import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Clock, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BlogCardProps {
  post: {
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
    is_featured?: boolean;
  };
  index: number;
  featured?: boolean;
}

const BlogCard = ({ post, index, featured = false }: BlogCardProps) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
        ease: "easeOut" as const
      }
    }
  };

  if (featured) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative group"
      >
        <Link to={`/blog/${post.slug}`} className="block">
          <div className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden blog-hero-card">
            {/* Background Image */}
            {post.cover_image_url && (
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-wrap gap-2 mb-4">
                {post.category && (
                  <Badge className="bg-primary/80 hover:bg-primary text-primary-foreground">
                    {post.category}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-background/50 backdrop-blur-sm">
                  Featured
                </Badge>
              </div>
              
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              
              {post.excerpt && (
                <p className="text-lg text-muted-foreground mb-6 line-clamp-2 max-w-2xl">
                  {post.excerpt}
                </p>
              )}
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {post.author_image_url ? (
                    <img
                      src={post.author_image_url}
                      alt={post.author_name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>{post.author_name}</span>
                </div>
                {post.published_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(post.published_at), "MMM dd, yyyy")}</span>
                  </div>
                )}
                {post.reading_time_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{post.reading_time_minutes} min read</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Hover arrow */}
            <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12">
              <div className="w-14 h-14 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary transition-colors">
                <ArrowRight className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group"
    >
      <Link to={`/blog/${post.slug}`} className="block h-full">
        <article className="h-full blog-card rounded-2xl overflow-hidden">
          {/* Cover Image */}
          {post.cover_image_url && (
            <div className="relative h-48 overflow-hidden">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
              
              {/* Reading time badge */}
              {post.reading_time_minutes && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {post.reading_time_minutes} min
                  </Badge>
                </div>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Category */}
            {post.category && (
              <Badge variant="secondary" className="blog-category-badge">
                {post.category}
              </Badge>
            )}
            
            {/* Title */}
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>
            
            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-muted-foreground text-sm line-clamp-2">
                {post.excerpt}
              </p>
            )}
            
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-2.5 w-2.5 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {post.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{post.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Meta */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {post.author_image_url ? (
                  <img
                    src={post.author_image_url}
                    alt={post.author_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="truncate max-w-[100px]">{post.author_name}</span>
              </div>
              
              {post.published_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(post.published_at), "MMM dd")}
                </span>
              )}
            </div>
            
            {/* Read more */}
            <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all pt-2">
              Read More <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
};

export default BlogCard;
