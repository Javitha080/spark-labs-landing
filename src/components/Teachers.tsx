import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Linkedin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface Teacher {
    id: string;
    name: string;
    role: string;
    bio: string | null;
    image_url: string | null;
    email: string | null;
    display_order: number;
}

const Teachers = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const { data, error } = await supabase
                    .from("teachers")
                    .select("*")
                    .order("display_order", { ascending: true })
                    .limit(2);

                if (error) throw error;
                setTeachers(data || []);
            } catch (error) {
                console.error("Error fetching teachers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
    }, []);

    if (loading || teachers.length === 0) return null;

    return (
        <section id="teachers" className="py-20 md:py-32 relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background">
            {/* Background decorations */}
            <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />

            <div className="container-custom">
                <div ref={headerRef} className="text-center mb-16 md:mb-24">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6 animate-fade-in">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium uppercase tracking-wider text-primary">Guidance & Mentorship</span>
                    </div>

                    <TextReveal animation="fade-up">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                            Teachers in <GradientTextReveal gradient="from-primary via-secondary to-accent">Charge</GradientTextReveal>
                        </h2>
                    </TextReveal>

                    <TextReveal animation="fade-up" delay={100}>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Our dedicated faculty mentors who guide, inspire, and support our journey of innovation.
                        </p>
                    </TextReveal>
                </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
                    {teachers.map((teacher, index) => (
                        <div
                            key={teacher.id}
                            className={`
                group relative glass-card p-8 md:p-10 rounded-3xl overflow-hidden
                border border-border/50 hover:border-primary/30 transition-all duration-500
                animate-fade-up
              `}
                            style={{ animationDelay: `${index * 200}ms` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                                {/* Image Container */}
                                <div className="shrink-0 relative">
                                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-xl ring-4 ring-background group-hover:ring-primary/20 transition-all duration-500">
                                        {teacher.image_url ? (
                                            <img
                                                src={teacher.image_url}
                                                alt={teacher.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
                                                {teacher.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    {/* Decorative Elements */}
                                    <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-secondary/10 rounded-full blur-xl -z-10" />
                                    <div className="absolute -top-3 -left-3 w-12 h-12 bg-primary/10 rounded-full blur-xl -z-10" />
                                </div>

                                {/* Content */}
                                <div className="text-center md:text-left flex-1">
                                    <h3 className="text-2xl md:text-3xl font-bold mb-2 group-hover:text-primary transition-colors">
                                        {teacher.name}
                                    </h3>
                                    <div className="inline-block px-3 py-1 rounded-lg bg-secondary/10 text-secondary font-medium text-sm mb-4">
                                        {teacher.role}
                                    </div>

                                    {teacher.bio && (
                                        <p className="text-muted-foreground mb-6 leading-relaxed">
                                            {teacher.bio}
                                        </p>
                                    )}

                                    {/* Contact */}
                                    <div className="flex items-center justify-center md:justify-start gap-3">
                                        {teacher.email && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 rounded-xl group/btn hover:bg-primary/10 hover:border-primary/50"
                                                onClick={() => window.location.href = `mailto:${teacher.email}`}
                                            >
                                                <Mail className="w-4 h-4 group-hover/btn:text-primary transition-colors" />
                                                <span className="group-hover/btn:text-primary transition-colors">Email</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Teachers;
