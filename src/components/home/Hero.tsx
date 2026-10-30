import { ArrowRight, Sparkles, Users, Rocket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { supabase } from "@/integrations/supabase/client";
import { ContentBlock } from "@/types/landing";
import { GSAPButtonHaptic } from "@/components/animation/GSAPResponsiveReveal";
import { useTheme } from "next-themes";
import { isTouchLike } from "@/lib/motion";
import { scrollToTarget } from "@/lib/scroll";
import { BOOT_EVENT, hasBooted } from "@/lib/boot";
import DotGrid from "@/components/reactbits/DotGrid";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";
import StarBorder from "@/components/reactbits/StarBorder";
import SplitText from "@/components/reactbits/SplitText";
import RotatingText from "@/components/reactbits/RotatingText";
import ClickSpark from "@/components/reactbits/ClickSpark";
import Magnet from "@/components/reactbits/Magnet";
import GradualBlur from "@/components/reactbits/GradualBlur";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ===========================================
   HERO
   Ember-on-carbon. DotGrid dust (ReactBits) as the
   only ambience; every entrance is boot-gated so the
   reveal lands after the boot screen lifts.
   =========================================== */

// Title type scale, shared by the SplitText reveal and its boot-phase
// placeholder so the layout never shifts when the reveal mounts.
const HERO_TITLE_CLASSES =
    "text-6xl xs:text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] leading-none font-display font-black lowercase tracking-tighter text-foreground";

const Hero = () => {
    const { resolvedTheme } = useTheme();
    const isDarkTheme = resolvedTheme !== "light";
    const containerRef = useRef<HTMLDivElement>(null);
    const heroContentRef = useRef<HTMLDivElement>(null);

    const [stats, setStats] = useState({ members: 100, projects: 50, awards: 15 });
    // Fallback hero copy/stats render immediately; Supabase content_blocks and
    // count queries overwrite them when available. Failures keep these defaults.
    const [content, setContent] = useState<Record<string, string>>({
        badge_text: "young innovators club \u2022 est 2020",
        main_heading: "Young Innovators Club",
        sub_heading: "Innovate. Create. Disrupt.",
        description: "Empowering the next generation of tech leaders at Dharmapala Vidyalaya Pannipitiya.",
        cta_primary: "Join the Club",
        cta_secondary: "Our Projects",
        stat_awards_label: "Awards",
    });

    // Boot gate: hero entrance waits for the boot screen (first visit per
    // session) or a failsafe delay so the hero can never stay hidden.
    const [booted, setBooted] = useState(hasBooted);
    useEffect(() => {
        if (booted) return;
        const onBooted = () => setBooted(true);
        window.addEventListener(BOOT_EVENT, onBooted, { once: true });
        const failsafe = window.setTimeout(onBooted, 2600);
        return () => {
            window.removeEventListener(BOOT_EVENT, onBooted);
            window.clearTimeout(failsafe);
        };
    }, [booted]);

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

                // Fetch counts silently - RLS may block anonymous HEAD requests on some tables
                try {
                    const { count: membersCount } = await supabase
                        .from("team_members_public")
                        .select("id", { count: "exact" })
                        .limit(1);
                    if (membersCount) setStats((s) => ({ ...s, members: membersCount }));
                } catch {
                    // Fallback value already set in initial state
                }

                try {
                    const { count: projectsCount } = await supabase
                        .from("projects")
                        .select("id", { count: "exact" })
                        .limit(1);
                    if (projectsCount) setStats((s) => ({ ...s, projects: projectsCount }));
                } catch {
                    // Fallback value already set in initial state
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        // react-doctor-disable no-initialize-state
        fetchData();
    }, []);

    const scrollToSection = useCallback((id: string) => {
        scrollToTarget(id);
    }, []);

    // Reduced motion: dust grid goes static (no WebGL), entrances skip.
    const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchDevice = isTouchLike();

    // CMS sub-heading splits on "." → phrases for RotatingText
    // (e.g. "Innovate. Create. Disrupt."); one phrase stays static.
    const subPhrases = content.sub_heading
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean);

    return (
        <section
            ref={containerRef}
            id="hero"
            className="relative min-h-[100dvh] bg-background text-foreground overflow-hidden flex items-center"
        >
            {/* Ambience: pointer-reactive DotGrid (ReactBits). Static grid for
                reduced motion, no layer at all for touch (canvas cost). */}
            <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none">
                {reducedMotion ? (
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `
              linear-gradient(hsl(var(--foreground) / 0.04) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground) / 0.04) 1px, transparent 1px)
            `,
                            backgroundSize: "48px 48px",
                            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 80%)",
                            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 80%)",
                        }}
                    />
                ) : !touchDevice ? (
                    <DotGrid
                        dotSize={1.8}
                        gap={26}
                        baseColor={isDarkTheme ? "#57402a" : "#d9cdbc"}
                        activeColor={isDarkTheme ? "#f97316" : "#c2410c"}
                        opacity={isDarkTheme ? 0.45 : 0.55}
                        glow={isDarkTheme ? 0.25 : 0.15}
                        proximity={140}
                        tension={160}
                        className="h-full w-full"
                    />
                ) : null}
            </div>

            <div
                ref={heroContentRef}
                className="container relative z-10 px-4 md:px-6 flex flex-col items-center justify-center pt-24 md:pt-28 lg:pt-24 pb-8"
            >
                {/* Top Badge (the single eyebrow pill of the page) */}
                <m.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={booted ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                    className="mb-8 mt-2"
                >
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card text-sm font-medium text-foreground/80">
                        <Sparkles className="size-4 text-primary" aria-hidden="true" />
                        <span className="uppercase tracking-widest text-[10px] font-bold">{content.badge_text}</span>
                    </div>
                </m.div>

                {/* Main typography — ReactBits SplitText; the word flip runs
                    once boot lifts (placeholder holds the same layout before
                    that so nothing jumps). Reduced motion renders plain text. */}
                <div className="relative w-full max-w-5xl mx-auto text-center">
                    <h1>
                        {booted && !reducedMotion ? (
                            <SplitText
                                text={content.main_heading}
                                tag="span"
                                trigger="load"
                                splitType="words"
                                effect="flip"
                                delay={80}
                                duration={0.8}
                                textAlign="center"
                                className={HERO_TITLE_CLASSES}
                            />
                        ) : (
                            <span className={HERO_TITLE_CLASSES} style={booted ? undefined : { visibility: "hidden" }}>
                                {content.main_heading}
                            </span>
                        )}
                        <span className="sr-only">
                            Young Innovators Club, Dharmapala Vidyalaya Pannipitiya
                        </span>
                    </h1>

                    <m.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={booted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="text-lg sm:text-2xl md:text-3xl mt-6 sm:mt-8 font-medium tracking-tight leading-snug max-w-xl mx-auto px-4 sm:px-0"
                    >
                        {/* CMS phrases split on "." rotate; a phrase without
                            periods (or reduced motion) keeps the static line. */}
                        {subPhrases.length > 1 && booted && !reducedMotion ? (
                            <RotatingText
                                texts={subPhrases}
                                splitBy="characters"
                                staggerDuration={0.02}
                                rotationInterval={2400}
                                loop
                                auto
                                mainClassName="gradient-text font-display"
                            />
                        ) : (
                            <span className="gradient-text font-display">
                                {content.sub_heading}
                            </span>
                        )}
                    </m.h2>
                </div>

                {/* Description & CTA */}
                <div className="mt-10 sm:mt-12 flex flex-col items-center gap-8 max-w-2xl mx-auto text-center">
                    <div className="text-base sm:text-lg md:text-xl font-body text-muted-foreground leading-relaxed">
                        {booted ? (
                            <BlurText
                                text={content.description}
                                animateBy="words"
                                trigger="load"
                                delay={480}
                                direction="bottom"
                                blur={5}
                                className="text-foreground/90"
                            />
                        ) : (
                            <span className="opacity-0">{content.description}</span>
                        )}
                    </div>

                    {/* ReactBits ClickSpark wraps the CTA row: an ember spark
                        burst on every CTA click (overlay canvases are
                        pointer-events-none, so clicks pass through). */}
                    <ClickSpark
                        sparkColor={isDarkTheme ? ["#f97316", "#fdba74"] : ["#ea580c", "#f59e0b"]}
                        sparkSize={10}
                        sparkCount={10}
                        sparkRadius={26}
                    >
                        <m.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={booted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ duration: 0.6, delay: 0.9 }}
                            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center"
                        >
                            <StarBorder
                                color={isDarkTheme ? "#f97316" : "#c2410c"}
                                trailColor={isDarkTheme ? "#7c2d12" : "#f97316"}
                                backgroundColor={isDarkTheme ? "#0a0a0a" : "#ffffff"}
                                textColor={isDarkTheme ? "#fafafa" : "#1c1917"}
                                radius={999}
                                thickness={1.5}
                                hover="brighten"
                                onClick={() => scrollToSection("join")}
                                className="px-6"
                            >
                                <span className="flex items-center gap-2 text-base sm:text-lg font-semibold whitespace-nowrap">
                                    <Sparkles className="size-4 text-primary" aria-hidden="true" />
                                    {content.cta_primary}
                                    <ArrowRight className="size-5 text-primary" aria-hidden="true" />
                                </span>
                            </StarBorder>

                            {/* ReactBits Magnet pulls the secondary CTA toward
                                the cursor; off for touch + reduced motion. */}
                            <Magnet padding={60} disabled={touchDevice || reducedMotion}>
                                <GSAPButtonHaptic>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => scrollToSection("projects")}
                                        className="rounded-full px-8 text-lg glass-card border-primary/20 hover:border-primary/40 transition-all"
                                    >
                                        {content.cta_secondary}
                                    </Button>
                                </GSAPButtonHaptic>
                            </Magnet>
                        </m.div>
                    </ClickSpark>
                </div>

                {/* Stats - ember glass bar (token-driven; theme-guaranteed contrast) */}
                <m.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={booted ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ delay: 1.05, duration: 0.8 }}
                    className="pt-10 sm:pt-12 pb-16 sm:pb-20 relative z-20"
                >
                    <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-primary/40 via-accent/25 to-primary/40 shadow-2xl shadow-primary/20">
                        <div className="glass-pane-subtle relative inline-flex flex-wrap items-center justify-center gap-4 md:gap-10 px-6 py-6 md:px-10 rounded-2xl w-full border border-border/40">
                            <HeroStat value={stats.members} label="Members" icon={Users} />
                            <div className="w-px h-10 bg-border/50 hidden sm:block" aria-hidden="true" />
                            <HeroStat value={stats.projects} label="Projects" icon={Rocket} />
                            <div className="w-px h-10 bg-border/50 hidden sm:block" aria-hidden="true" />
                            <HeroStat value={stats.awards} label={content.stat_awards_label} icon={Zap} />
                        </div>
                    </div>
                </m.div>
            </div>

            {/* ReactBits GradualBlur: softens the dust grid + stats band edge
                where the hero hands off to the next section. */}
            <GradualBlur
                target="parent"
                position="bottom"
                height="4rem"
                strength={1.6}
                layers={4}
                opacity={0.9}
                zIndex={5}
            />
        </section>
    );
};

/* ReactBits CountUp rolls the number when it scrolls into view. */
const HeroStat = ({
    value,
    label,
    icon: Icon,
}: {
    value: number;
    label: string;
    icon: React.ElementType;
}) => (
    <div className="text-center px-4 py-2 group">
        <div className="flex items-center justify-center gap-2.5 mb-1">
            <Icon className="size-5 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            <CountUp
                to={value}
                duration={1.8}
                easing="expo"
                trigger="view"
                suffix="+"
                className="text-3xl md:text-4xl font-display font-bold text-foreground tabular-nums"
            />
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">{label}</div>
    </div>
);

export default Hero;
