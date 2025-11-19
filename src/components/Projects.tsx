import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, isVisible } = useScrollAnimation(0.1);

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
    <section id="projects" className="section-padding bg-muted" ref={ref as any}>
      <div className="container-custom">
        <div className={`text-center mb-16 animate-on-scroll ${isVisible ? 'visible' : ''}`}>
          <h2 className="condensed-text text-5xl md:text-7xl lg:text-8xl mb-6">
            <span className="block text-foreground">INNOVATION</span>
            <span className="block text-brutalist-primary">PROJECTS</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-bold">
            Showcasing student creativity and engineering excellence
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading projects...</div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group relative overflow-hidden border-4 border-foreground hover:border-primary transition-all aspect-square"
              >
                {project.image_url && (
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                )}
                
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6">
                  <div className="text-center">
                    {project.category && (
                      <span className="inline-block px-3 py-1 mb-3 bg-primary text-primary-foreground text-xs font-bold uppercase">
                        {project.category}
                      </span>
                    )}
                    <h3 className="condensed-text text-3xl text-white mb-2">
                      {project.title.toUpperCase()}
                    </h3>
                    {project.description && (
                      <p className="text-white/80 text-sm">{project.description}</p>
                    )}
                    <Button variant="outline" className="mt-4 border-white text-white hover:bg-white hover:text-black">
                      VIEW PROJECT <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 border-brutalist p-8">
            <p className="text-lg font-bold">No projects available at the moment.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
