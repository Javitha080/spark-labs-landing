import { ArrowRight, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('display_order', { ascending: true });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        toast({
          title: "Error loading projects",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getBentoClass = (index: number, isFeatured: boolean) => {
    if (isFeatured) return "md:col-span-2 md:row-span-2";
    const patternPosition = index % 7;
    if (patternPosition === 0) return "md:col-span-2";
    if (patternPosition === 3) return "md:row-span-2";
    return "";
  };

  const ProjectCard = ({ project, index }: { project: any; index: number }) => {
    const { ref, isVisible } = useScrollAnimation({
      threshold: 0.1,
      triggerOnce: true,
    });

    const bentoClass = getBentoClass(index, project.is_featured);

    return (
      <div
        ref={ref}
        className={`group relative overflow-hidden rounded-[2rem] bg-card border border-border/50 
          hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10
          ${bentoClass}
          ${isVisible ? 'animate-fade-up' : 'opacity-0'}
        `}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Background Gradient & Image */}
        <div className="absolute inset-0 z-0">
          {project.image_url ? (
            <img
              src={project.image_url}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-70" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              {project.category && (
                <span className="px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                  {project.category}
                </span>
              )}
              {project.is_featured && (
                <span className="px-3 py-1 rounded-full bg-yellow-500/20 backdrop-blur-md text-yellow-500 text-xs font-bold uppercase tracking-wider border border-yellow-500/20 flex items-center gap-1">
                  Featured
                </span>
              )}
            </div>

            <h3 className={`font-bold leading-tight group-hover:text-primary transition-colors duration-300 ${bentoClass.includes('row-span-2') ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
              {project.title}
            </h3>

            {project.description && (
              <p className="text-muted-foreground leading-relaxed line-clamp-3 group-hover:text-foreground/90 transition-colors">
                {project.description}
              </p>
            )}
          </div>

          <div className="space-y-4 pt-6 mt-auto">
            {/* Email Subscription - Only show on larger cards or if specifically configured */}
            {(bentoClass.includes('col-span-2') || project.is_featured) && (
              <div className="relative group/input">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-20 group-hover/input:opacity-50 transition duration-500" />
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Get updates on this project"
                      className="pl-10 bg-background/80 border-border/50 focus:ring-primary/50"
                    />
                  </div>
                  <Button size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Link to={`/project/${project.id}`} className="block">
              <Button
                variant="ghost"
                className="w-full group/btn justify-between hover:bg-white/5 border border-white/5 hover:border-white/10"
              >
                <span className="font-medium">View Details</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="projects" className="section-padding relative overflow-hidden bg-muted/5 dark:bg-black/20">
      {/* Background accents */}
      <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 animate-pulse" />
      <div className="absolute bottom-20 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px] -z-10 animate-pulse delay-700" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight">
              Innovation <GradientTextReveal gradient="from-primary via-secondary to-accent">Lab Projects</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Showcasing the groundbreaking work of our student innovators, from robotics to sustainable energy solutions.
            </p>
          </TextReveal>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[300px]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`rounded-[2rem] bg-muted/30 animate-pulse ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`} />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[350px]">
            {projects.map((project, index) => (
              <ProjectCard key={project.id ?? index} project={project} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-6 rounded-[3rem] border border-dashed border-border/50 bg-muted/5">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚀</span>
            </div>
            <p className="text-lg font-medium text-muted-foreground">No projects launched yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Our lab is currently brewing new ideas!</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
