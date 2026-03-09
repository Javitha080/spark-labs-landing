import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const StatsSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [stats, setStats] = useState([
        { value: "320K", label: "Lines of Code", rotate: 0 },
        { value: "7+", label: "Members", rotate: 0 },
        { value: "1+", label: "Projects", rotate: 0 },
        { value: "15+", label: "Awards Won", rotate: 0 },
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            const { data } = await supabase
                .from("content_blocks")
                .select("*")
                .eq("page_name", "landing_page")
                .eq("section_name", "impact_stats");

            if (data && data.length > 0) {
                // Map the fetched data to the stats array
                const newStats = [
                    {
                        value: data.find(b => b.block_key === "stat_1_value")?.content_value || "320K",
                        label: data.find(b => b.block_key === "stat_1_label")?.content_value || "Lines of Code",
                        rotate: 0
                    },
                    {
                        value: data.find(b => b.block_key === "stat_2_value")?.content_value || "7+",
                        label: data.find(b => b.block_key === "stat_2_label")?.content_value || "Members",
                        rotate: 0
                    },
                    {
                        value: data.find(b => b.block_key === "stat_3_value")?.content_value || "1+",
                        label: data.find(b => b.block_key === "stat_3_label")?.content_value || "Projects",
                        rotate: 0
                    },
                    {
                        value: data.find(b => b.block_key === "stat_4_value")?.content_value || "15+",
                        label: data.find(b => b.block_key === "stat_4_label")?.content_value || "Awards",
                        rotate: 0
                    }
                ];
                setStats(newStats);
            }
        };

        fetchStats();
    }, []);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    const x = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

    return (
        <section
            id="impact"
            ref={containerRef}
            className="py-24 bg-background border-y border-border/50 overflow-hidden relative"
        >
            <div className="container mx-auto px-4 mb-16 relative">
                <h2 className="text-4xl md:text-6xl font-display font-bold uppercase text-center md:text-left tracking-tight">
                    Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Impact</span>
                </h2>
                <div className="hidden md:flex absolute -top-10 right-0 w-24 h-24 bg-primary/10 rounded-full items-center justify-center font-mono font-bold text-primary transform rotate-12 backdrop-blur-sm border border-primary/20">
                    {new Date().getFullYear()}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto px-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            delay: i * 0.1,
                        }}
                        whileHover={{ scale: 1.05 }}
                        className="group relative w-full"
                        viewport={{ once: true }}
                    >
                        <div
                            className="glass-card text-card-foreground p-6 sm:p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-glass transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
                        >
                            <div className="font-mono text-4xl md:text-6xl font-bold tracking-tighter mb-2 text-primary">
                                {stat.value}
                            </div>
                            <div className="font-display font-medium uppercase text-sm tracking-widest text-muted-foreground px-2 py-1 inline-block bg-muted/50 rounded-full">
                                {stat.label}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Marquee Effect at bottom */}
            <div className="mt-20 overflow-hidden">
                <motion.div
                    className="whitespace-nowrap flex font-display text-4xl font-bold uppercase text-muted-foreground/10 tracking-wider will-change-transform hover:[animation-play-state:paused]"
                    style={{ x }}
                >
                    {Array(4).fill(null).map((_, i) => (
                        <span key={i} className="flex items-center gap-6 px-6">
                            <span>Innovate</span>
                            <span className="text-primary/30">•</span>
                            <span>Create</span>
                            <span className="text-primary/30">•</span>
                            <span>Disrupt</span>
                            <span className="text-primary/30">•</span>
                        </span>
                    ))}
                </motion.div>
            </div>

        </section>
    );
};

export default StatsSection;
