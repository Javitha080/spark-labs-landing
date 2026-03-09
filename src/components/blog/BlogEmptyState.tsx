import { motion } from 'framer-motion';
import { Lightbulb, Rocket, Cpu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BlogEmptyStateProps {
  isAdmin?: boolean;
}

const BlogEmptyState = ({ isAdmin = false }: BlogEmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Animated illustration */}
      <div className="relative w-64 h-64 mb-8">
        {/* Glowing background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 rounded-full blur-3xl animate-pulse" />

        {/* Central lightbulb */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-secondary to-accent p-1">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Lightbulb className="w-16 h-16 text-primary" />
              </div>
            </div>

            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-primary rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [0, Math.cos((i * 60 * Math.PI) / 180) * 80],
                  y: [0, Math.sin((i * 60 * Math.PI) / 180) * 80],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Floating icons */}
        <motion.div
          className="absolute top-4 right-4"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm flex items-center justify-center">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-4 left-4"
          animate={{
            y: [0, 10, 0],
            rotate: [0, -10, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 backdrop-blur-sm flex items-center justify-center">
            <Cpu className="w-6 h-6 text-secondary" />
          </div>
        </motion.div>

        <motion.div
          className="absolute top-8 left-0"
          animate={{
            x: [0, -5, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
        </motion.div>
      </div>

      {/* Text content */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl md:text-3xl font-bold text-center mb-4"
      >
        <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          No Inventions Recorded Yet
        </span>
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center max-w-md mb-8"
      >
        The innovation journey is just beginning! Check back soon for exciting stories about groundbreaking projects and brilliant inventors.
      </motion.p>

      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/admin/blog">
            <Button className="btn-glow">
              Create First Post
            </Button>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BlogEmptyState;
