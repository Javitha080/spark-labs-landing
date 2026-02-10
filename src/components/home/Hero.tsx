import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const Hero = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <section
            ref={containerRef}
            className="relative min-h-screen bg-background text-foreground overflow-hidden pt-20 flex items-center"
        >
            {/* Soft Gradient Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-secondary/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
                <div className="absolute top-[40%] left-[40%] w-[40vw] h-[40vw] bg-accent/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
            </div>

            <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center justify-center">

                {/* Top Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-md border border-border/50 rounded-full shadow-sm hover:shadow-md transition-all font-medium text-sm text-muted-foreground hover:text-foreground">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Young Innovators Club</span>
                    </div>
                </motion.div>

                {/* Typography */}
                <div className="relative w-full max-w-5xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/50"
                    >
                        YICDVP
                    </motion.h1>

                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-2xl md:text-4xl font-light mt-6 tracking-wide text-muted-foreground"
                    >
                        Innovate <span className="text-primary mx-2">•</span> Create <span className="text-primary mx-2">•</span> Disrupt
                    </motion.h2>
                </div>

                {/* Subtitle & CTA */}
                <div className="mt-12 flex flex-col items-center gap-8 max-w-2xl mx-auto text-center">
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="text-lg md:text-xl font-body text-muted-foreground leading-relaxed"
                    >
                        Empowering the next generation of tech leaders at <br />
                        <span className="font-semibold text-foreground">Dharmapala Vidyalaya Pannipitiya</span>.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                    >
                        <Button
                            size="lg"
                            className="rounded-full px-8 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1"
                        >
                            Join the Club <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-full px-8 text-lg border-primary/20 hover:bg-primary/5 transition-all"
                        >
                            Our Projects
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50"
            >
                <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
                <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <ArrowDown className="w-4 h-4" />
                </motion.div>
            </motion.div>
        </section>
    );
};

export default Hero;
