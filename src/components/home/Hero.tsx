import { ArrowDown, ArrowRight, Sparkles, Users, Rocket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContentBlock } from "@/types/landing";

/* ===========================================
   HERO SECTION - Soft Gradient Mesh Animation
   With glassmorphism, particles, and parallax
   =========================================== */

// Animated gradient mesh background
const GradientMesh = () => (
    <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Primary gradient orb */}
        <motion.div
            className="absolute w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full"
            style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)",
                filter: "blur(80px)",
                top: "-15%",
                right: "-10%",
            }}
            animate={{
                x: [0, 30, -20, 0],
                y: [0, -40, 20, 0],
                scale: [1, 1.15, 0.95, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Secondary gradient orb */}
        <motion.div
            className="absolute w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full"
            style={{
                background: "radial-gradient(circle, hsl(var(--accent) / 0.2) 0%, transparent 70%)",
                filter: "blur(100px)",
                bottom: "-20%",
                left: "-10%",
            }}
            animate={{
                x: [0, -25, 35, 0],
                y: [0, 30, -15, 0],
                scale: [1, 1.1, 0.9, 1],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        {/* Accent gradient orb */}
        <motion.div
            className="absolute w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full"
            style={{
                background: "radial-gradient(circle, hsl(262 80% 60% / 0.15) 0%, transparent 70%)",
                filter: "blur(90px)",
                top: "40%",
                left: "35%",
            }}
            animate={{
                x: [0, 40, -30, 0],
                y: [0, -20, 40, 0],
                scale: [1, 1.2, 0.85, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        />
        {/* Subtle grid overlay */}
        <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
                backgroundImage: `
          linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
        `,
                backgroundSize: "80px 80px",
            }}
        />
    </div>
);

// Floating particles
const FloatingParticles = () => {
    const particles = useMemo(() =>
        [...Array(20)].map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1.5,
            duration: Math.random() * 15 + 12,
            delay: Math.random() * 5,
        })),
        []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        background: "hsl(var(--primary))",
                        boxShadow: `0 0 ${p.size * 3}px hsl(var(--primary) / 0.5)`,
                    }}
                    animate={{
                        y: [0, -25, 0],
                        opacity: [0.15, 0.6, 0.15],
                        scale: [1, 1.3, 1],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
};

// Animated counter component
const AnimatedCounter = ({ value, label, icon: Icon }: { value: number; label: string; icon: React.ElementType }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });

    useEffect(() => {
        if (!isInView) return;
        const duration = 2000;
        const steps = 60;
        const increment = value / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [isInView, value]);

    return (
        <motion.div
            ref={ref}
            className="text-center px-6 py-3"
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <div className="flex items-center justify-center gap-2 mb-1">
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-3xl md:text-4xl font-display font-bold text-foreground tabular-nums">
                    {count}+
                </span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold opacity-70">{label}</div>
        </motion.div>
    );
};

const Hero = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);

    const [stats, setStats] = useState({ members: 100, projects: 50, awards: 15 });
    const [content, setContent] = useState<Record<string, string>>({
        badge_text: "young innovators club • est 2020",
        main_heading: "yicdvp",
        sub_heading: "Innovate. Create. Disrupt.",
        description: "Empowering the next generation of tech leaders at Dharmapala Vidyalaya Pannipitiya.",
        cta_primary: "Join the Club",
        cta_secondary: "Our Projects",
        stat_awards_label: "Awards",
    });

    // Fetch stats and content from DB
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch dynamic content blocks
                const { data: blocks, error } = await supabase
                    .from("content_blocks")
                    .select("*")
                    .eq("page_name", "landing_page")
                    .eq("section_name", "hero");

                if (error) {
                    console.error("Error fetching hero content:", error);
                }

                if (blocks && blocks.length > 0) {
                    const newContent = { ...content };
                    (blocks as ContentBlock[]).forEach(block => {
                        if (block.block_key in newContent) {
                            newContent[block.block_key] = block.content_value;
                        }
                        // specific handling for awards value if it exists in content blocks
                        if (block.block_key === 'stat_awards_value') {
                            setStats(s => ({ ...s, awards: parseInt(block.content_value) || 15 }));
                        }
                    });
                    setContent(newContent);
                }

                const { count: membersCount } = await supabase
                    .from("team_members_public")
                    .select("*", { count: "exact", head: true });

                const { count: projectsCount } = await supabase
                    .from("projects")
                    .select("*", { count: "exact", head: true });

                if (membersCount) setStats((s) => ({ ...s, members: membersCount }));
                if (projectsCount) setStats((s) => ({ ...s, projects: projectsCount }));
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    const scrollToSection = useCallback((id: string) => {
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: "smooth" });
    }, []);

    return (
        <section
            ref={containerRef}
            id="hero"
            className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center"
        >
            <GradientMesh />
            <FloatingParticles />

            <motion.div
                style={{ y, opacity, scale }}
                className="container relative z-10 px-4 md:px-6 flex flex-col items-center justify-center pt-20 md:pt-24 lg:pt-20"
            >
                {/* Top Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-8 mt-5 pt-3"
                >
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card text-sm font-medium text-foreground/80">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="w-4 h-4 text-primary" />
                        </motion.div>
                        <span className="uppercase tracking-widest text-[10px] font-bold">{content.badge_text}</span>
                    </div>
                </motion.div>

                {/* Main Typography */}
                <div className="relative w-full max-w-5xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-[9rem] xs:text-10xl sm:text-7xl md:text-8xl tablet:text-9xl lg:text-[10rem] xl:text-[12rem] leading-none font-display font-black lowercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/80 to-foreground/50"
                        style={{ textShadow: '0 0 60px hsl(var(--primary) / 0.15)' }}
                    >
                        {content.main_heading}
                    </motion.h1>

                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-lg sm:text-2xl md:text-3xl mt-4 sm:mt-8 font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-xl mx-auto px-4 sm:px-0"
                    >
                        {content.sub_heading}
                    </motion.h2>
                </div>

                {/* Subtitle & CTA */}
                <div className="mt-12 flex flex-col items-center gap-8 max-w-2xl mx-auto text-center">
                    <motion.p
                        initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        className="text-base sm:text-lg md:text-xl font-body text-muted-foreground leading-relaxed"
                    >
                        {content.description}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.6, delay: 0.9 }}
                        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                    >
                        <Button
                            size="lg"
                            onClick={() => scrollToSection("join")}
                            className="rounded-full px-8 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 btn-glow"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {content.cta_primary} <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => scrollToSection("projects")}
                            className="rounded-full px-8 text-lg glass-card border-primary/20 hover:border-primary/40 transition-all"
                        >
                            {content.cta_secondary}
                        </Button>
                    </motion.div>
                </div>

                {/* Stats - Glass Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ delay: 1.1, duration: 0.8 }}
                    className="pt-10 sm:pt-12 pb-16 sm:pb-20"
                >
                    <div className="inline-flex flex-wrap items-center justify-center gap-4 md:gap-6 p-6 rounded-2xl glass-card">
                        <AnimatedCounter value={stats.members} label="Members" icon={Users} />
                        <div className="w-px h-10 bg-border/50 hidden sm:block" />
                        <AnimatedCounter value={stats.projects} label="Projects" icon={Rocket} />
                        <div className="w-px h-10 bg-border/50 hidden sm:block" />
                        <AnimatedCounter value={stats.awards} label={content.stat_awards_label} icon={Zap} />
                    </div>
                </motion.div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/80 z-50 drop-shadow-md"
            >
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Scroll</span>
                <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <ArrowDown className="w-5 h-5 text-primary" />
                </motion.div>
            </motion.div>
        </section>
    );
};

export default Hero;
