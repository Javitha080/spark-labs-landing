import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { GradientTextReveal, TextReveal } from "@/components/animation/TextReveal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";


interface Teacher {
    id: string;
    name: string;
    role: string;
    bio: string | null;
    image_url: string | null;
    email: string | null;
}

// Full Bleed Glassmorphism Profile Card
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
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.1 + 0.2, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="group relative"
        >
            {/* Card Container - Fixed Height */}
            <div 
                className="relative w-full h-[500px] md:h-[550px] rounded-[40px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 border border-white/50"
            >
                {/* Background Image - Full Bleed */}
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

                {/* Gradient Blur Overlay - Bottom Only */}
                <div 
                    className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 40%, rgba(255, 255, 255, 0.4) 70%, transparent 100%)",
                    }}
                />

                {/* Content Layer - Bottom Positioned */}
                <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end">
                    {/* Header - Name + Verified Badge */}
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
                            {mentor.name}
                        </h3>
                        {/* Verified Rosette Badge */}
                        <CheckCircle2 className="w-6 h-6 text-[#27AE60] fill-[#27AE60]/20 flex-shrink-0" />
                    </div>

                    {/* Teacher Title */}
                    <p className="text-sm font-semibold text-[#27AE60] uppercase tracking-wider mt-1">
                        {mentor.role}
                    </p>

                    {/* Bio Text */}
                    <p className="text-base text-[#333333] leading-relaxed mt-3">
                        {mentor.bio || `Expert in guiding young innovators with years of experience.`}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

// Dark Mode Variant
const MentorCardDark = ({ 
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
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.1 + 0.2, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="group relative"
        >
            {/* Card Container */}
            <div 
                className="relative w-full h-[500px] md:h-[550px] rounded-[40px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-2 border border-white/20"
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
                        <div className="w-full h-full bg-gradient-to-br from-muted/80 via-muted/60 to-muted/40 flex items-center justify-center">
                            <span className="text-8xl">👨‍🏫</span>
                        </div>
                    )}
                </div>

                {/* Dark Gradient Overlay */}
                <div 
                    className="absolute inset-x-0 bottom-0 h-[60%] pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 35%, rgba(0, 0, 0, 0.3) 65%, transparent 100%)",
                    }}
                />

                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            {mentor.name}
                        </h3>
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20 flex-shrink-0" />
                    </div>

                    {/* Teacher Title */}
                    <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mt-1">
                        {mentor.role}
                    </p>

                    {/* Bio */}
                    <p className="text-base text-white/80 leading-relaxed mt-3">
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
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

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
                <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-20 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/3 rounded-full blur-[150px]" />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {mentors?.map((mentor, index) => (
                            // Use theme-aware card variant
                            isDark ? (
                                <MentorCardDark 
                                    key={mentor.id} 
                                    mentor={mentor} 
                                    index={index} 
                                    isInView={isInView} 
                                />
                            ) : (
                                <MentorCard 
                                    key={mentor.id} 
                                    mentor={mentor} 
                                    index={index} 
                                    isInView={isInView} 
                                />
                            )
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Teachers;
