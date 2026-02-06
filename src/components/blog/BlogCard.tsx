import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Clock, Tag, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["2.5deg", "-2.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-2.5deg", "2.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: index * 0.1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ease: [0.16, 1, 0.3, 1] as any
      }
    }
  };

  const content = (
    <div className={cn(
      "relative h-full overflow-hidden transition-all duration-500",
      featured ? "rounded-[2rem] sm:rounded-[2.5rem]" : "rounded-2xl sm:rounded-3xl",
      "bg-background/40 backdrop-blur-[50px] backdrop-saturate-[180%] border border-white/10 shadow-2xl group",
      featured
        ? "min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]"
        : "min-h-[350px] sm:min-h-[450px] lg:min-h-[500px]"
    )}>
      {/* Glow Effect */}
      <div className="absolute -inset-px bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />

      {/* Background Image with Parallax-ish Effect */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted" />
        )}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t transition-opacity duration-500",
          featured ? "from-background via-background/60 to-transparent" : "from-background via-background/80 to-background/20"
        )} />
      </div>

      {/* Card Body */}
      <div className="flex flex-col h-full p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap gap-2 mb-6">
          {post.category && (
            <Badge className="bg-primary/20 backdrop-blur-md text-primary border-primary/20 hover:bg-primary/30 transition-colors py-1 px-4 text-xs font-bold uppercase tracking-wider">
              {post.category}
            </Badge>
          )}
          {featured && (
            <Badge className="bg-accent/20 backdrop-blur-md text-accent border-accent/20 py-1 px-4 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 mr-1.5" /> Featured Story
            </Badge>
          )}
        </div>

        <div className="mt-auto space-y-4">
          <h2 className={cn(
            "font-black leading-tight tracking-tight text-white group-hover:text-primary transition-colors duration-300",
            featured ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl" : "text-xl sm:text-2xl md:text-3xl"
          )}>
            {post.title}
          </h2>

          {post.excerpt && (
            <p className={cn(
              "text-muted-foreground leading-relaxed line-clamp-2 transition-colors group-hover:text-foreground/90",
              featured ? "text-base sm:text-lg lg:text-xl max-w-2xl" : "text-sm sm:text-base"
            )}>
              {post.excerpt}
            </p>
          )}

          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-white/5 text-[10px] sm:text-xs md:text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 overflow-hidden bg-white/5">
                {post.author_image_url ? (
                  <img src={post.author_image_url} alt={post.author_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-[8px] sm:text-[10px]">PI</div>
                )}
              </div>
              <span>{post.author_name}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50" />
              <span>{post.published_at ? format(new Date(post.published_at), "MMM dd, yyyy") : "Draft"}</span>
            </div>

            {post.reading_time_minutes && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50" />
                <span>{post.reading_time_minutes} min read</span>
              </div>
            )}
          </div>
        </div>

        {/* Read More Button - Styled like a floating action */}
        <div className="absolute bottom-8 right-8 pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all duration-500 scale-90 group-hover:scale-110">
            <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "perspective-1000",
        featured ? "col-span-full" : "col-span-1"
      )}
    >
      <Link to={`/blog/${post.slug}`} className="block h-full cursor-none-ignore">
        <motion.div
          style={{
            transformStyle: "preserve-3d",
            translateZ: "20px",
          }}
          className="h-full"
        >
          {content}
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default BlogCard;

