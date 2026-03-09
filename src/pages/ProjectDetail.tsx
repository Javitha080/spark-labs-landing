import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Project {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
}

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Loading size="lg" className="min-h-[60vh]" />
        <Footer />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Project Not Found</h1>
            <p className="text-muted-foreground mb-8">The project you're looking for doesn't exist.</p>
            <Link to="/projects">
              <Button variant="default" className="btn-glow">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <SEOHead
        title={`${project.title} | Young Innovators Club`}
        description={project.description || `${project.title} — A project by the Young Innovators Club at Dharmapala Vidyalaya.`}
        path={`/project/${id}`}
        ogImage={project.image_url || undefined}
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container-custom">
          <Link to="/projects">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>

          <div className="max-w-5xl mx-auto">
            {project.image_url && (
              <div className="relative h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden mb-8 glow-border animate-fade-up">
                <img
                  src={project.image_url}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              </div>
            )}

            <div className="space-y-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              {project.category && (
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {project.category}
                </Badge>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold gradient-text">
                {project.title}
              </h1>

              <div className="prose prose-lg prose-invert max-w-none mt-8">
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  {project.description || "No description available for this project."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProjectDetail;
