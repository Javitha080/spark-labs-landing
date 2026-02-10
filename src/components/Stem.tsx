import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Atom, CircuitBoard, Cpu, Globe, Rocket, Microscope } from "lucide-react";
import { GradientTextReveal, TextReveal } from "@/components/animation/TextReveal";

const Stem = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

    const topics = [
        { icon: CircuitBoard, title: "Robotics", desc: "Building the future with intelligent machines." },
        { icon: Cpu, title: "Coding", desc: "The language of innovation." },
        { icon: Globe, title: "IoT", desc: "Connecting the world through smart devices." },
        { icon: Rocket, title: "Aerospace", desc: "Reaching for the stars." },
        { icon: Microscope, title: "Science", desc: "Discovering the unknown." },
        { icon: Atom, title: "Physics", desc: "Understanding the universe." }, // 'atom' is likely lowercase in lucide import if using dynamic icon but here it's fine
    ];

    return (
        <section ref={sectionRef} id="stem" className="py-24 bg-background relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <TextReveal animation="fade-up">
                        <h2 className="text-5xl md:text-7xl font-black lowercase mb-6 tracking-tighter">
                            stem <GradientTextReveal gradient="from-primary via-secondary to-accent">education</GradientTextReveal>
                        </h2>
                    </TextReveal>
                    <TextReveal animation="fade-up" delay={100}>
                        <p className="text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
                            Empowering students with Science, Technology, Engineering, and Mathematics.
                        </p>
                    </TextReveal>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {topics.map((topic, i) => (
                        <motion.div
                            key={topic.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all cursor-pointer group"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <topic.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest mb-1">{topic.title}</h3>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Stem;
