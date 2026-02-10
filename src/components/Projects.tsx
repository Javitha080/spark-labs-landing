import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Tables } from "@/integrations/supabase/types";

/* ===========================================
   PROJECTS SECTION - Glassmorphism Cards
   With reveal animations and hover effects
   =========================================== */

// Use the Supabase generated type for full type safety
type Project = Tables<"projects">;

const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const cardRef = useRef<HTMLElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ delay: index * 0.1, duration: 0.6, type: "spring" as const }}
      whileHover={{ y: -10 }}
      className="group relative rounded-2xl glass-card overflow-hidden cursor-pointer"
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"
        style={{ boxShadow: '0 0 60px hsl(var(--primary) / 0.2)' }}
      />

      {/* Image with overlay */}
      <div className="aspect-[4/3] overflow-hidden relative">
        {project.image_url ? (
          <>
            <motion.img
              src={project.image_url}
              alt={project.title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.6 }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
            <Sparkles className="w-12 h-12 opacity-20" />
          </div>
        )}

        {/* Category badge */}
        {project.category && (
          <motion.span
            className="absolute top-4 left-4 px-3 py-1.5 text-xs font-medium rounded-full glass-card text-primary border border-primary/20 z-20"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            {project.category}
          </motion.span>
        )}

        {/* Status badge */}
        {project.status && (
          <motion.span
            className="absolute top-4 right-4 px-2 py-1 text-[10px] font-medium rounded-full bg-muted/80 text-muted-foreground z-20 capitalize"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.1 + 0.4 }}
          >
            {project.status}
          </motion.span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 relative z-10">
        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
          {project.title}
          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </h3>

        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      </div>

      {/* Bottom glow line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.4 }}
      />
    </motion.article>
  );
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("is_featured", true)
          .order("display_order", { ascending: true })
          .limit(6);

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error("Error loading projects:", error);
        toast({
          title: "Error loading projects",
          description: "Could not fetch projects from database",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fallback projects when database is empty
  const fallbackProjects: Project[] = [
    {
      id: "1",
      title: "Smart Waste Management",
      description: "IoT-based solution for efficient waste collection and monitoring in urban areas.",
      image_url: "/placeholder.svg",
      category: "IoT",
      is_featured: true,
      status: "completed",
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "AR Learning Platform",
      description: "Augmented reality app making science education interactive and engaging.",
      image_url: "/placeholder.svg",
      category: "Education",
      is_featured: true,
      status: "completed",
      display_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Solar Tracker System",
      description: "Automated solar panel system for maximum energy efficiency and sustainability.",
      image_url: "/placeholder.svg",
      category: "Renewable Energy",
      is_featured: true,
      status: "in-progress",
      display_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const displayProjects = projects.length > 0 ? projects : fallbackProjects;

  return (
    <section ref={sectionRef} id="projects" className="section-padding bg-background relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[150px] opacity-15"
          style={{
            background: 'hsl(var(--accent) / 0.3)',
            bottom: '-10%',
            right: '-5%',
          }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="container-custom relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16"
        >
          <div className="max-w-2xl">
            <motion.span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium glass-card text-primary mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
            >
              <Sparkles className="w-4 h-4" />
              Featured Work
            </motion.span>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
              Our <span className="text-primary" style={{ textShadow: '0 0 30px hsl(var(--primary) / 0.3)' }}>Projects</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Explore innovative solutions created by our talented members.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link to="/projects">
              <Button className="rounded-full px-6 glass-card border-primary/30 hover:border-primary/60 group">
                View All
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="h-80 rounded-2xl glass-card animate-pulse"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {displayProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
