import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Tables } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

/* ===========================================
   PROJECTS SECTION - React Query + Glassmorphism
   =========================================== */

type Project = Tables<"projects">;

// Fetch projects using React Query for caching and retries
const fetchProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("display_order", { ascending: true })
    .limit(6);

  if (error) throw error;
  return data || [];
};

const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const cardRef = useRef<HTMLElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.2 });

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
      animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ delay: index * 0.1, duration: 0.6, type: "spring" }}
      whileHover={{ y: -8 }}
      className="group relative rounded-2xl glass-card overflow-hidden cursor-pointer"
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"
        style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.15)" }}
      />

      {/* Image with overlay */}
      <div className="aspect-[4/3] overflow-hidden relative">
        {project.image_url ? (
          <>
            <motion.img
              src={project.image_url}
              alt={project.title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.6 }}
              loading="lazy"
            />
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
            className="absolute top-4 right-4 px-2 py-1 text-[10px] font-medium rounded-full bg-muted/80 backdrop-blur-sm text-muted-foreground z-20 capitalize"
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
        <h3 className="text-2xl font-bold lowercase mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
          {project.title.toLowerCase()}
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

// Fallback projects when DB is empty
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

const Projects = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-featured"],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const displayProjects = projects.length > 0 ? projects : fallbackProjects;

  return (
    <section ref={sectionRef} id="projects" className="section-padding bg-background relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[150px] opacity-15"
          style={{
            background: "hsl(var(--accent) / 0.3)",
            bottom: "-10%",
            right: "-5%",
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
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold glass-card text-primary mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
            >
              <Sparkles className="w-3 h-3" />
              featured work
            </motion.span>

            <h2 className="text-5xl md:text-7xl lg:text-8xl font-display font-black lowercase tracking-tighter mb-4">
              our{" "}
              <span className="text-primary" style={{ textShadow: "0 0 30px hsl(var(--primary) / 0.3)" }}>
                projects
              </span>
            </h2>
            <p className="text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-xl">
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
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="h-80 rounded-2xl glass-card"
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
