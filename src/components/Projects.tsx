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

  return (
    <section id="projects" className="section-padding relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-20 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <GradientTextReveal gradient="from-primary via-secondary to-accent">
                Innovation
              </GradientTextReveal> Projects
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Showcasing student creativity and engineering excellence
            </p>
          </TextReveal>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground animate-pulse">Loading projects...</div>
        ) : projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {projects.map((project, index) => {
              const { ref, isVisible } = useScrollAnimation({
                threshold: 0.1,
                triggerOnce: true,
              });

              return (
                <div
                  key={project.id}
                  ref={ref}
                  className={` vivid-contrast-card rounded-2xl overflow-hidden group relative
                    transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl
                    ${isVisible ? 'animate-fade-up' : 'opacity-0'}
                  `}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Vivid gradient border effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

                  {project.image_url && (
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {/* Vivid overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                      {/* Category badge with vivid colors */}
                      {project.category && (
                        <div className="absolute top-4 right-4">
                          <span className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold uppercase tracking-wide shadow-lg backdrop-blur-sm">
                            {project.category}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6 md:p-8 bg-gradient-to-br from-background via-background to-muted/20 relative">
                    {/* Corner accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-3xl" />

                    <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors relative z-10 bg-gradient-to-r from-foreground to-foreground group-hover:from-primary group-hover:to-secondary bg-clip-text">
                      {project.title}
                    </h3>

                    {project.description && (
                      <p className="text-muted-foreground mb-6 leading-relaxed line-clamp-3 relative z-10">
                        {project.description}
                      </p>
                    )}

                    {/* Email subscription with vivid styling */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 relative z-10">
                      <div className="relative w-full sm:flex-1">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input
                          placeholder="Your email"
                          className="pl-10 bg-background/50 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 w-full rounded-xl"
                        />
                      </div>
                      <Button className="group/btn w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 border-0 shadow-lg hover:shadow-primary/50 transition-all">
                        Subscribe
                        <Send className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-all" />
                      </Button>
                    </div>

                    {/* View details button */}
                    <Link to={`/project/${project.id}`} className="block">
                      <Button
                        variant="ghost"
                        className="group/details w-full border-2 border-primary/20 hover:border-primary hover:bg-primary/10 rounded-xl transition-all"
                      >
                        View Project Details
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/details:translate-x-2 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg">No projects available at the moment.</p>
            <p className="text-sm mt-2">Check back soon for exciting innovations!</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
