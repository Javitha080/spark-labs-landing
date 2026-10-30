import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errors";
import Reveal from "@/components/animation/Reveal";
import CountUp from "@/components/reactbits/CountUp";
import ScrollVelocity from "@/components/reactbits/ScrollVelocity";

/* Stats roll in with ReactBits CountUp (odometer roll, once per view). */

const StatsSection = () => {
    // Fallback stats render immediately; Supabase content_blocks overwrite them
    // when available. Failed/empty fetches keep these - never blank, never crash.
    const [stats, setStats] = useState([
        { value: "320K", label: "Lines of Code" },
        { value: "7+", label: "Members" },
        { value: "1+", label: "Projects" },
        { value: "15+", label: "Awards Won" },
    ]);

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            try {
                const { data, error } = await supabase
                    .from("content_blocks")
                    .select("block_key, content_value")
                    .eq("page_name", "landing_page")
                    .eq("section_name", "impact_stats");

                if (error) {
                    logError(error, "StatsSection.fetch");
                    return;
                }

                if (!isMounted || !data || data.length === 0) return;

                const get = (k: string, fb: string) =>
                    data.find((b) => b.block_key === k)?.content_value || fb;

                setStats([
                    { value: get("stat_1_value", "320K"), label: get("stat_1_label", "Lines of Code") },
                    { value: get("stat_2_value", "7+"), label: get("stat_2_label", "Members") },
                    { value: get("stat_3_value", "1+"), label: get("stat_3_label", "Projects") },
                    { value: get("stat_4_value", "15+"), label: get("stat_4_label", "Awards") },
                ]);
            } catch (err) {
                logError(err, "StatsSection.fetch");
            }
        };

        // react-doctor-disable no-initialize-state
        fetchStats();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <section
            id="impact"
            className="py-24 bg-background border-y border-border/50 overflow-hidden relative"
        >
            <div className="container-custom">
                <Reveal delay={0.1} distance={20} trigger="scroll" once className="mb-14">
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black lowercase tracking-tighter">
                        our <span className="text-primary">impact</span>
                    </h2>
                </Reveal>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {stats.map((stat, i) => (
                        <Reveal
                            key={stat.label}
                            delay={i * 0.07}
                            distance={24}
                            once
                        >
                            <div className="glass-card text-card-foreground p-6 sm:p-8 rounded-2xl h-full hover:-translate-y-1 hover:border-primary/30 transition-all duration-300">
                                <div className="font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter mb-3 text-primary tabular-nums">
                                    <StatNumber value={stat.value} />
                                </div>
                                <div className="font-display font-medium uppercase text-xs tracking-widest text-muted-foreground">
                                    {stat.label}
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>

                {/* ReactBits ScrollVelocity: scroll-reactive marquee between the
                    stats and the next section. Pace reacts to scroll speed and
                    rows alternate direction; the component animates nothing
                    under prefers-reduced-motion. */}
                <div aria-hidden="true" className="mt-14 text-foreground/25">
                    <ScrollVelocity
                        texts={[
                            "build · ship · learn · repeat",
                            "code · create · collab · compete",
                        ]}
                        velocity={40}
                        numCopies={4}
                        separator="✦"
                        pauseOnHover
                        fadeEdges
                        skewWithVelocity={0.6}
                        fontSize="clamp(1.5rem, 4vw, 2.75rem)"
                        className="font-display font-black lowercase tracking-tighter"
                    />
                </div>
            </div>
        </section>
    );
};

/* DB values arrive as "320K", "7+", "15+" - CountUp needs a number plus a
   text suffix; compact-mode formatting restores the K/M/B scale for the
   big line-of-code figure. */
const StatNumber = ({ value }: { value: string }) => {
    const raw = String(value).trim();
    const match = raw.match(/^(-?\d+(?:\.\d+)?)([KMB]?)([+]?)(.*)$/i);
    if (!match) return <span>{raw}</span>;
    const [, numStr, scale, plus, tail] = match;
    const modifier =
        scale.toUpperCase() === "K"
            ? 1000
            : scale.toUpperCase() === "M"
              ? 1_000_000
              : scale.toUpperCase() === "B"
                ? 1_000_000_000
                : 1;
    const numeric = Math.round(parseFloat(numStr) * modifier);
    const needsCompact = modifier > 1;
    return (
        <CountUp
            to={numeric}
            format={needsCompact ? "compact" : "standard"}
            duration={1.6}
            easing="expo"
            trigger="view"
            suffix={`${plus}${tail}`}
            className="tabular-nums"
        />
    );
};

export default StatsSection;
