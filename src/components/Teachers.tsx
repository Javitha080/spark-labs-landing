import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
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

// Unified Glassmorphism Mentor Card — adapts to dark/light via CSS variables
const MentorCard = ({
    mentor,
    index,
    isInView
}: {
    mentor: Teacher;
    index: number;
    isInView: boolean;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40, filter: "blur(6px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ delay: index * 0.12 + 0.2, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="group relative"
        >
            {/* Card Container */}
            <div
                className="relative w-full h-[360px] sm:h-[420px] md:h-[460px] lg:h-[520px] rounded-[32px] overflow-hidden shadow-glass hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 border border-border/50 hover:border-primary/30"
            >
                {/* Background Image */}
                <div className="absolute inset-0">
                    {mentor.image_url ? (
                        <img
                            src={mentor.image_url}
                            alt={mentor.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/50 flex items-center justify-center">
                            <span className="text-8xl">👨‍🏫</span>
                        </div>
                    )}
                </div>

                {/* Theme-adaptive Gradient Overlay */}
                <div
                    className="absolute inset-x-0 bottom-0 h-[60%] pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.9) 30%, hsl(var(--background) / 0.4) 65%, transparent 100%)",
                    }}
                />

                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                            {mentor.name}
                        </h3>
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 fill-emerald-500/20 flex-shrink-0" />
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mt-1">
                        {mentor.role}
                    </p>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-3 line-clamp-3">
                        {mentor.bio || `Expert in guiding young innovators with years of experience.`}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

const Teachers = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

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
        <section ref={sectionRef} id="teachers" className="py-20 sm:py-24 bg-background relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-20 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16 sm:mb-20">
                    <TextReveal animation="fade-up">
                        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black lowercase mb-4 sm:mb-6 tracking-tighter">
                            our <GradientTextReveal gradient="from-primary via-secondary to-accent">mentors</GradientTextReveal>
                        </h2>
                    </TextReveal>
                    <TextReveal animation="fade-up" delay={100}>
                        <p className="text-lg sm:text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
                            Guiding us with wisdom, experience, and unwavering support.
                        </p>
                    </TextReveal>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !mentors || mentors.length === 0 ? (
                    <div className="flex justify-center items-center py-16">
                        <p className="text-muted-foreground text-center">No teachers to display at this time</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
                        {mentors?.map((mentor, index) => (
                            <MentorCard
                                key={mentor.id}
                                mentor={mentor}
                                index={index}
                                isInView={isInView}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Teachers;


