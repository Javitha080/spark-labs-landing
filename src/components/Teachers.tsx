import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Linkedin, Mail, Loader2 } from "lucide-react";
import { GradientTextReveal, TextReveal } from "@/components/animation/TextReveal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Teacher {
    id: string;
    name: string;
    role: string;
    bio: string | null;
    image_url: string | null;
    email: string | null;
}

const Teachers = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

    const { data: mentors, isLoading } = useQuery({
        queryKey: ["teachers"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("teachers")
                .select("*")
                .order("display_order", { ascending: true });

            if (error) {
                throw error;
            }
            return data as Teacher[];
        },
    });

    return (
        <section ref={sectionRef} id="teachers" className="py-24 bg-background relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-20 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <TextReveal animation="fade-up">
                        <h2 className="text-5xl md:text-7xl font-black lowercase mb-6 tracking-tighter">
                            our <GradientTextReveal gradient="from-primary via-secondary to-accent">mentors</GradientTextReveal>
                        </h2>
                    </TextReveal>
                    <TextReveal animation="fade-up" delay={100}>
                        <p className="text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
                            Guiding us with wisdom, experience, and unwavering support.
                        </p>
                    </TextReveal>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {mentors?.map((mentor, index) => (
                            <motion.div
                                key={mentor.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/5 rounded-3xl transform rotate-1 group-hover:rotate-2 transition-transform duration-300" />

                                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-primary/30 transition-all duration-300 h-full flex flex-col items-center text-center">
                                    {/* Image Placeholder */}
                                    <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-white/10 group-hover:border-primary/30 transition-colors">
                                        {mentor.image_url ? (
                                            <img src={mentor.image_url} alt={mentor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <span className="text-4xl">👨‍🏫</span>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-bold tracking-tight mb-2 group-hover:text-primary transition-colors">
                                        {mentor.name}
                                    </h3>

                                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase tracking-widest font-bold mb-6">
                                        {mentor.role}
                                    </span>

                                    {mentor.bio && (
                                        <blockquote className="text-muted-foreground/80 italic leading-relaxed mb-6 flex-grow">
                                            "{mentor.bio}"
                                        </blockquote>
                                    )}

                                    <div className="flex gap-4 mt-auto">
                                        <button className="p-2 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors">
                                            <Linkedin className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Teachers;
