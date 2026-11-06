import { ArrowRight, Sparkles, Users, Rocket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "framer-motion";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLandingBlocks } from "@/hooks/useLandingBlocks";
import { GSAPButtonHaptic } from "@/components/animation/GSAPResponsiveReveal";
import { useTheme } from "next-themes";
import { isTouchLike } from "@/lib/motion";
import { supportsWebGL2 } from "@/lib/webglSupport";
import { scrollToTarget } from "@/lib/scroll";
import { BOOT_EVENT, hasBooted } from "@/lib/boot";
import Dither from "@/components/reactbits/Dither";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";
import StarBorder from "@/components/reactbits/StarBorder";
import TechText from "@/components/reactbits/TechText";
import RotatingText from "@/components/reactbits/RotatingText";
import ClickSpark from "@/components/reactbits/ClickSpark";
import Magnet from "@/components/reactbits/Magnet";
import GradualBlur from "@/components/reactbits/GradualBlur";

/* ===========================================
   HERO
   Ember-on-carbon. Dither wave field (ReactBits) as the
   only ambience; every entrance is boot-gated so the
   reveal lands after the boot screen lifts.
   =========================================== */

// Static stand-in for the wave field: the dust grid, used by reduced-motion
// users and devices without a WebGL2 context.
const StaticHeroGrid = () => (
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
);

// Title wrapper height scale for the TechText wordmark. The boot-phase
// placeholder span below still uses the old type scale (HERO_TITLE_CLASSES) so
// the layout never shifts when the canvas mounts.
const HERO_TITLE_CLASSES =
    "text-6xl xs:text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] leading-none font-display font-black lowercase tracking-tighter text-foreground";

// Fallback hero copy renders immediately; CMS content_blocks overwrite it when
// available. Failures keep these defaults.
const HERO_DEFAULTS: Record<string, string> = {
    badge_text: "young innovators club \u2022 est 2020",
    main_heading: "Young Innovators Club",
    sub_heading: "Innovate. Create. Disrupt.",
    description: "Empowering the next generation of tech leaders at Dharmapala Vidyalaya Pannipitiya.",
    cta_primary: "Join the Club",
    cta_secondary: "Our Projects",
    stat_awards_label: "Awards",
};

const Hero = () => {
    const { resolvedTheme } = useTheme();
    const isDarkTheme = resolvedTheme !== "light";
    const containerRef = useRef<HTMLDivElement>(null);
    const heroContentRef = useRef<HTMLDivElement>(null);

    // Live counts (fallbacks until the count queries resolve).
    const [counts, setCounts] = useState({ members: 100, projects: 50 });
    // CMS copy comes from the shared, cached landing-blocks query (one request
    // for Hero + Stats + Contact instead of three). It is derived rather than
    // synced into state, so there is no extra render pass when it arrives.
    const { blocks: heroBlocks } = useLandingBlocks("hero");
    const content = useMemo(() => {
        const next = { ...HERO_DEFAULTS };
        for (const key of Object.keys(next)) {
            if (key in heroBlocks) next[key] = heroBlocks[key];
        }
        return next;
    }, [heroBlocks]);
    const stats = useMemo(
        () => ({
            ...counts,
            awards: "stat_awards_value" in heroBlocks ? parseInt(heroBlocks.stat_awards_value) || 15 : 15,
        }),
        [counts, heroBlocks],
    );

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

    // Live counts. The two reads are independent, so they run concurrently;
    // each failure (RLS may block anonymous counts) keeps its fallback value.
    useEffect(() => {
        let alive = true;
        const countOf = async (run: () => PromiseLike<{ count: number | null }>) => {
            try {
                const { count } = await run();
                return count || 0;
            } catch {
                return 0;
            }
        };
        Promise.all([
            countOf(() => supabase.from("team_members_public").select("id", { count: "exact" }).limit(1)),
            countOf(() => supabase.from("projects").select("id", { count: "exact" }).limit(1)),
        ]).then(([members, projects]) => {
            if (!alive) return;
            setCounts((c) => ({
                members: members || c.members,
                projects: projects || c.projects,
            }));
        });
        return () => {
            alive = false;
        };
    }, []);

    const scrollToSection = useCallback((id: string) => {
        scrollToTarget(id);
    }, []);

    // Reduced motion: dust grid goes static (no WebGL), entrances skip.
    const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchDevice = isTouchLike();
    // The ReactBits canvas layers need a webgl2 context; probing once keeps
    // a WebGL-less phone on the static grid instead of a dead canvas slot.
    const hasWebGL2 = useMemo(() => supportsWebGL2(), []);

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
            {/* Ambience: pointer-reactive Dither wave field (ReactBits).
                Static grid for reduced motion or no WebGL2; cheaper canvas
                instance for touch (lower DPR + chunkier dither cells, no
                pointer layer); full canvas elsewhere. Transparent background
                keeps the page bg. */}
            <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none">
                {reducedMotion || !hasWebGL2 ? (
                    <StaticHeroGrid />
                ) : touchDevice ? (
                    <Dither
                        waveSpeed={0.07}
                        waveFrequency={2.2}
                        waveAmplitude={0.3}
                        waveColor={isDarkTheme ? "#f97316" : "#c2410c"}
                        backgroundColor="transparent"
                        ditherMode="bayer"
                        pixelSize={3}
                        dpr={1.25}
                        enableMouseInteraction={false}
                        className="h-full w-full"
                    />
                ) : (
                    <Dither
                        waveSpeed={0.07}
                        waveFrequency={2.2}
                        waveAmplitude={0.3}
                        waveColor={isDarkTheme ? "#f97316" : "#c2410c"}
                        backgroundColor="transparent"
                        ditherMode="bayer"
                        pixelSize={2}
                        mouseEffect="erase"
                        mouseRadius={1.1}
                        className="h-full w-full"
                    />
                )}
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

                {/* Main typography — ReactBits TechText canvas wordmark
                    (pointer-driven dashed paths). Mounts once boot lifts:
                    a fixed-height wrapper holds the slot before that so
                    nothing jumps. Reduced motion renders plain text. */}
                <div className="relative w-full max-w-5xl mx-auto text-center">
                    <h1>
                        {booted && !reducedMotion ? (
                            <div className="relative h-24 xs:h-28 sm:h-32 md:h-36 lg:h-40 font-display text-foreground">
                                <TechText
                                    text={content.main_heading}
                                    fontWeight={900}
                                    fontSize={180}
                                    align="center"
                                    accentColor={isDarkTheme ? "#f97316" : "#c2410c"}
                                    intro="assemble"
                                    introDuration={2}
                                    draggable={false}
                                    clickKick={false}
                                />
                            </div>
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
                            periods (or reduced motion) keeps the static line.
                            The gradient must live on the element that actually
                            moves: background-clip:text painted on the outer
                            wrapper leaves a full-opacity ghost of the exiting
                            word behind the entering one. */}
                        {subPhrases.length > 1 && booted && !reducedMotion ? (
                            <RotatingText
                                texts={subPhrases}
                                splitBy="words"
                                staggerDuration={0.02}
                                rotationInterval={2400}
                                loop
                                auto
                                mainClassName="font-display"
                                elementLevelClassName="gradient-text"
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
