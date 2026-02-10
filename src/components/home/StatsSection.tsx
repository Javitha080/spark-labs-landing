import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const stats = [
    { value: "320K", label: "Lines of Code", rotate: 0 },
    { value: "500+", label: "Active Members", rotate: 0 },
    { value: "(45%)", label: "Female Engineers", rotate: 0 },
    { value: "12", label: "Awards Won", rotate: 0 },
];

const StatsSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    const x = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

    return (
        <section
            ref={containerRef}
            className="py-24 bg-background border-y border-border/50 overflow-hidden"
        >
            <div className="container mx-auto px-4 mb-16 relative">
                <h2 className="text-4xl md:text-6xl font-display font-bold uppercase text-center md:text-left tracking-tight">
                    Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Impact</span>
                </h2>
                <div className="hidden md:flex absolute -top-10 right-0 w-24 h-24 bg-primary/10 rounded-full items-center justify-center font-mono font-bold text-primary transform rotate-12 backdrop-blur-sm border border-primary/20">
                    2024
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
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
                        className="group relative"
                        viewport={{ once: true }}
                    >
                        <div
                            className="bg-card/50 backdrop-blur-sm text-card-foreground p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-glass transition-all hover:-translate-y-1"
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
            <div className="mt-20 border-t border-border/20 pt-8 overflow-hidden">
                <motion.div
                    className="whitespace-nowrap flex gap-8 font-display text-4xl font-bold uppercase text-muted-foreground/10"
                    style={{ x }}
                >
                    {Array(10).fill("Innovate • Create • Disrupt • ").map((text, i) => (
                        <span key={i}>{text}</span>
                    ))}
                </motion.div>
            </div>

        </section>
    );
};

export default StatsSection;
