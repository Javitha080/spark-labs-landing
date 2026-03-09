import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Projects from "@/components/Projects";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

/* ===========================================
   PROJECTS PAGE - All projects with filtering
   =========================================== */

type Project = Tables<"projects">;

const ProjectsPage = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data, error } = await supabase
                    .from("projects")
                    .select("*")
                    .order("display_order", { ascending: true });

                if (error) throw error;
                setProjects(data || []);

                // Extract unique categories
                const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean))] as string[];
                setCategories(uniqueCategories);
            } catch (error) {
                console.error("Error loading projects:", error);
                toast.error("Failed to load projects");
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const filteredProjects = filter === "all"
        ? projects
        : projects.filter(p => p.category === filter);

    return (
        <div className="min-h-screen bg-background">
            <SEOHead
                title="Student Projects | Young Innovators Club"
                description="Explore innovative STEM projects in robotics, IoT, solar energy, and more — built by students of the Young Innovators Club."
                path="/projects"
            />
            <Header />
            <main className="pt-24">
                {/* Page Header */}
                <section className="section-padding bg-background border-b border-border">
                    <div className="container-custom">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Link to="/">
                                <Button variant="ghost" className="mb-6 -ml-4">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Button>
                            </Link>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4">
                                Our <span className="text-primary">Projects</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
                                Explore all the innovative projects created by our talented members.
                            </p>

                            {/* Category filters */}
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={filter === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilter("all")}
                                    className="rounded-full"
                                >
                                    All Projects
                                </Button>
                                {categories.map((cat) => (
                                    <Button
                                        key={cat}
                                        variant={filter === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setFilter(cat)}
                                        className="rounded-full"
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Projects Grid */}
                <section className="section-padding">
                    <div className="container-custom">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-80 rounded-2xl glass-card animate-pulse" />
                                ))}
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="text-center py-16">
                                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No projects found in this category.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredProjects.map((project, index) => (
                                    <motion.article
                                        key={project.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1, duration: 0.5 }}
                                        className="group rounded-2xl glass-card overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                                    >
                                        <Link to={`/project/${project.id}`}>
                                            <div className="aspect-[4/3] overflow-hidden bg-muted">
                                                {project.image_url ? (
                                                    <img
                                                        src={project.image_url}
                                                        alt={project.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Sparkles className="w-12 h-12 text-muted-foreground/20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-6">
                                                {project.category && (
                                                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary mb-3">
                                                        {project.category}
                                                    </span>
                                                )}
                                                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                                                    {project.title}
                                                </h3>
                                                <p className="text-muted-foreground text-sm line-clamp-2">
                                                    {project.description}
                                                </p>
                                            </div>
                                        </Link>
                                    </motion.article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default ProjectsPage;
