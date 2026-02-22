import NeoCard from "@/components/ui/NeoCard";
import { BadgeCheck, BrainCircuit, Rocket, Shield, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

const features = [
    {
        title: "Innovation Hub",
        description: "Where ideas transform into reality through cutting-edge tech.",
        icon: <BrainCircuit className="w-8 h-8" />,
        colSpan: "lg:col-span-2",
        variant: "primary" as const,
    },
    {
        title: "Community",
        description: "Join 500+ student innovators.",
        icon: <Users className="w-8 h-8" />,
        colSpan: "lg:col-span-1",
        variant: "secondary" as const,
    },
    {
        title: "Workshops",
        description: "Hands-on learning sessions every week.",
        icon: <Zap className="w-8 h-8" />,
        colSpan: "lg:col-span-1",
        variant: "accent" as const,
    },
    {
        title: "Projects",
        description: "Real-world projects that make an impact.",
        icon: <Rocket className="w-8 h-8" />,
        colSpan: "lg:col-span-2",
        variant: "default" as const,
    },
];

const FeatureGrid = () => {
    return (
        <section className="py-20 bg-background" id="features">
            <div className="container mx-auto px-4">
                <div className="mb-12 text-center md:text-left">
                    <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black lowercase mb-4 tracking-tighter">
                        why <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">join us?</span>
                    </h2>
                    <p className="text-lg sm:text-xl md:text-2xl md:text-3xl font-medium tracking-tight leading-snug text-muted-foreground max-w-2xl font-body">
                        We provide the platform, tools, and mentorship. You bring the passion.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            whileHover={{
                                scale: 1.02,
                                rotateY: 3,
                                rotateX: -2,
                                transition: { duration: 0.3 }
                            }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                            viewport={{ once: true }}
                            className={feature.colSpan}
                            style={{ perspective: '800px' }}
                        >
                            <NeoCard
                                variant={feature.variant}
                                className="h-full flex flex-col justify-between"
                            >
                                <div className="mb-4">
                                    <div className="bg-background/50 border border-primary/20 w-12 h-12 flex items-center justify-center rounded-xl shadow-sm mb-4 text-primary">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-2xl font-medium tracking-tight leading-snug mb-2">
                                        {feature.title.toLowerCase()}
                                    </h3>
                                    <p className="font-body text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                                <div className="flex justify-end">
                                    <BadgeCheck className="w-6 h-6 text-primary/40" />
                                </div>
                            </NeoCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeatureGrid;
