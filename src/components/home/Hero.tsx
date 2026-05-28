import { ArrowDown, ArrowRight, Sparkles, Users, Rocket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m, useInView, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { supabase } from "@/integrations/supabase/client";
import { ContentBlock } from "@/types/landing";

gsap.registerPlugin(ScrollTrigger);

/* ===========================================
   HERO SECTION - GSAP ScrollTrigger + CRT Power-On
   Replaced Framer Motion parallax with compositor-safe
   GSAP transforms. CRT flicker on first reveal.
   =========================================== */

// Animated gradient mesh background (unchanged — GPU-composited)
const GradientMesh = () => (
    <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Primary gradient orb */}
        <m.div
            className="absolute size-[60vw] max-w-[800px] max-h-[800px] rounded-full"
            style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)",
                filter: "blur(8px)",
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
        <m.div
            className="absolute size-[50vw] max-w-[700px] max-h-[700px] rounded-full"
            style={{
                background: "radial-gradient(circle, hsl(var(--accent) / 0.2) 0%, transparent 70%)",
                filter: "blur(8px)",
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
        <m.div
            className="absolute size-[40vw] max-w-[600px] max-h-[600px] rounded-full"
            style={{
                background: "radial-gradient(circle, hsl(262 80% 60% / 0.15) 0%, transparent 70%)",
                filter: "blur(8px)",
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

// Floating particles — reduced count, GPU-optimized (no scale, no boxShadow animation)
const FloatingParticles = () => {
    const [particles] = useState(() =>
        [...Array(4)].map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1.5,
            duration: Math.random() * 15 + 12,
            delay: Math.random() * 5,
        }))
    );

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
            {particles.map((p) => (
                <m.div
                    key={p.id}
                    className="absolute rounded-full will-change-transform"
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

// Animated counter component — uses RAF for smooth 60fps counting
const AnimatedCounter = ({ value, label, icon: Icon }: { value: number; label: string; icon: React.ElementType }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });

    useEffect(() => {
        if (!isInView) return;
        const duration = 1500;
        let start: number | null = null;
        let rafId: number;
        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            // Ease-out curve
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) {
                rafId = requestAnimationFrame(step);
            }
        };
        rafId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId);
    }, [isInView, value]);

    return (
        <m.div
            ref={ref}
            className="text-center px-6 py-3"
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <div className="flex items-center justify-center gap-2 mb-1">
                <Icon className="size-5 text-primary" />
                <span className="text-3xl md:text-4xl font-display font-bold text-foreground tabular-nums">
                    {count}+
                </span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold opacity-70">{label}</div>
        </m.div>
    );
};

/* ===========================================
   WORD-SPLIT TEXT REVEAL
   Splits heading into words, each animates
   in with GSAP ScrollTrigger
   =========================================== */
const WordReveal = ({ text, className }: { text: string; className?: string }) => {
    const containerRef = useRef<HTMLHeadingElement>(null);

    useGSAP(() => {
        if (!containerRef.current) return;
        const words = containerRef.current.querySelectorAll(".word-reveal-word");

        gsap.fromTo(
            words,
            {
                opacity: 0,
                y: 40,
                rotateX: -45,
            },
            {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.8,
                stagger: 0.08,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 85%",
                    once: true,
                },
            }
        );
    }, { scope: containerRef });

    return (
        <h1
            ref={containerRef}
            className={className}
            style={{ perspective: "1000px" }}
        >
            {text.split(" ").map((word, i) => (
                <span
                    key={`${word}-${i}`}
                    className="word-reveal-word inline-block"
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {word}
                    {i < text.split(" ").length - 1 && "\u00A0"}
                </span>
            ))}
        </h1>
    );
};

const Hero = () => {
    const prefersReducedMotion = useReducedMotion();
    const containerRef = useRef<HTMLDivElement>(null);
    const heroContentRef = useRef<HTMLDivElement>(null);

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
                    setContent(prev => {
                        const newContent = { ...prev };
                        (blocks as ContentBlock[]).forEach(block => {
                            if (block.block_key in newContent) {
                                newContent[block.block_key] = block.content_value;
                            }
                            if (block.block_key === 'stat_awards_value') {
                                setStats(s => ({ ...s, awards: parseInt(block.content_value) || 15 }));
                            }
                        });
                        return newContent;
                    });
                }

                // Fetch counts silently — RLS may block anonymous HEAD requests on some tables
                try {
                    const { count: membersCount } = await supabase
                        .from("team_members_public")
                        .select("*", { count: "exact", head: true });
                    if (membersCount) setStats((s) => ({ ...s, members: membersCount }));
                } catch {
                    // Fallback value already set in initial state
                }

                try {
                    const { count: projectsCount } = await supabase
                        .from("projects")
                        .select("*", { count: "exact", head: true });
                    if (projectsCount) setStats((s) => ({ ...s, projects: projectsCount }));
                } catch {
                    // Fallback value already set in initial state
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        // react-doctor-disable no-initialize-state
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
            {!prefersReducedMotion && <GradientMesh />}
            {!prefersReducedMotion && <FloatingParticles />}

            <div
                ref={heroContentRef}
                className="container relative z-10 px-4 md:px-6 flex flex-col items-center justify-center pt-20 md:pt-24 lg:pt-20"
            >
                {/* Top Badge */}
                <m.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="mb-8 mt-5 pt-3"
                >
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card text-sm font-medium text-foreground/80">
                        <m.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="size-4 text-primary" />
                        </m.div>
                        <span className="uppercase tracking-widest text-[10px] font-bold">{content.badge_text}</span>
                    </div>
                </m.div>

                {/* Main Typography — Word reveal on scroll */}
                <div className="relative w-full max-w-5xl mx-auto text-center">
                    {content.main_heading.includes(" ") ? (
                        <WordReveal
                            text={content.main_heading}
                            className="text-6xl xs:text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] leading-none font-display font-black lowercase tracking-tighter text-foreground"
                        />
                    ) : (
                        <m.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
                            className="text-6xl xs:text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] leading-none font-display font-black lowercase tracking-tighter text-foreground"
                            style={{ textShadow: '0 0 60px hsl(var(--primary) / 0.15)' }}
                        >
                            {content.main_heading}
                        </m.h1>
                    )}

                    <m.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.9 }}
                        className="text-lg sm:text-2xl md:text-3xl mt-4 sm:mt-8 font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-xl mx-auto px-4 sm:px-0"
                    >
                        {content.sub_heading}
                    </m.h2>
                </div>

                {/* Subtitle & CTA */}
                <div className="mt-12 flex flex-col items-center gap-8 max-w-2xl mx-auto text-center">
                    <m.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.1 }}
                        className="text-base sm:text-lg md:text-xl font-body text-muted-foreground leading-relaxed"
                    >
                        {content.description}
                    </m.p>

                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.3 }}
                        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                    >
                        <Button
                            size="lg"
                            onClick={() => scrollToSection("join")}
                            className="rounded-full px-8 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 btn-glow"
                        >
                            <Sparkles className="size-4 mr-2" />
                            {content.cta_primary} <ArrowRight className="ml-2 size-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => scrollToSection("projects")}
                            className="rounded-full px-8 text-lg glass-card border-primary/20 hover:border-primary/40 transition-all"
                        >
                            {content.cta_secondary}
                        </Button>
                    </m.div>
                </div>

                {/* Stats - Glass Card */}
                <m.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    className="pt-10 sm:pt-12 pb-16 sm:pb-20"
                >
                    <div className="inline-flex flex-wrap items-center justify-center gap-4 md:gap-6 p-6 rounded-2xl glass-card">
                        <AnimatedCounter value={stats.members} label="Members" icon={Users} />
                        <div className="w-px h-10 bg-border/50 hidden sm:block" />
                        <AnimatedCounter value={stats.projects} label="Projects" icon={Rocket} />
                        <div className="w-px h-10 bg-border/50 hidden sm:block" />
                        <AnimatedCounter value={stats.awards} label={content.stat_awards_label} icon={Zap} />
                    </div>
                </m.div>
            </div>

            {/* Scroll Indicator */}
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/80 z-50 drop-shadow-md"
            >
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Scroll</span>
                <m.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <ArrowDown className="size-5 text-primary" />
                </m.div>
            </m.div>
        </section>
    );
};

export default Hero;
