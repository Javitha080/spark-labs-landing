import { ArrowRight, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <section id="projects" className="section-padding bg-muted/30">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Innovation <span className="gradient-text">Projects</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Showcasing student creativity and engineering excellence
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading projects...</div>
        ) : projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="glass-card rounded-2xl overflow-hidden group hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-background/5 backdrop-blur-[2px] -z-10"></div>
                {project.image_url && (
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary to-primary-glow opacity-40 group-hover:opacity-30 transition-opacity" />
                  </div>
                )}

                <div className="p-8 bg-gradient-to-br from-background/90 via-background/80 to-background/90 backdrop-blur-md">
                  {project.category && (
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-3">
                      {project.category}
                    </span>
                  )}
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row items-center mt-4 sm:space-x-2 space-y-2 sm:space-y-0">
                    <div className="relative w-full sm:flex-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Your email" 
                        className="pl-10 bg-background/50 border-primary/20 focus:border-primary w-full"
                      />
                    </div>
                    <Button className="group/btn w-full sm:w-auto">
                      Subscribe
                      <Send className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-all" />
                    </Button>
                  </div>

                  <Link to={`/project/${project.id}`}>
                    <Button variant="ghost" className="group/btn w-full mt-4">
                      View Project Details
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">No projects available</div>
        )}
      </div>
    </section>
  );
};

export default Projects;
