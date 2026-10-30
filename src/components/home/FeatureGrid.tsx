import { BrainCircuit, Rocket, Users, Zap } from "lucide-react";
import { type CSSProperties } from "react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import Reveal from "@/components/animation/Reveal";
import { useTheme } from "next-themes";

const features = [
    {
        title: "Innovation Hub",
        description: "Where ideas become working prototypes with robotics, IoT, and web tools.",
        icon: <BrainCircuit className="size-8" />,
        colSpan: "lg:col-span-2",
    },
    {
        title: "Community",
        description: "Join 500+ student innovators.",
        icon: <Users className="size-8" />,
        colSpan: "lg:col-span-1",
    },
    {
        title: "Workshops",
        description: "Hands-on learning sessions every week.",
        icon: <Zap className="size-8" />,
        colSpan: "lg:col-span-1",
    },
    {
        title: "Projects",
        description: "Real-world projects that make an impact.",
        icon: <Rocket className="size-8" />,
        colSpan: "lg:col-span-2",
    },
];

const FeatureGrid = () => {
    const { resolvedTheme } = useTheme();
    const isDarkTheme = resolvedTheme !== "light";

    return (
        <section className="py-24 sm:py-28 bg-background" id="features">
            <div className="container-custom">
                <div className="mb-12 sm:mb-16 max-w-3xl">
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black lowercase tracking-tighter mb-4">
                        why <span className="text-primary">join us?</span>
                    </h2>
                    <p className="text-lg sm:text-xl font-medium tracking-tight leading-snug text-muted-foreground max-w-2xl">
                        We provide the platform, tools, and mentorship. You bring the passion.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {features.map((feature, idx) => (
                        <Reveal
                            key={feature.title}
                            delay={idx * 0.06}
                            distance={26}
                            once
                            className={feature.colSpan}
                        >
                            <SpotlightCard
                                theme={isDarkTheme ? "dark" : "light"}
                                ambient
                                spotlightColor={
                                    isDarkTheme
                                        ? "rgba(249, 115, 22, 0.32)"
                                        : "rgba(194, 65, 12, 0.26)"
                                }
                                className="group h-full flex flex-col justify-between rounded-2xl p-6 sm:p-8"
                                style={
                                    {
                                        "--spotlight-card-surface": "hsl(var(--card))",
                                        "--spotlight-card-border":
                                            "hsl(var(--border) / 0.9)",
                                    } as React.CSSProperties
                                }
                            >
                                <div className="bg-muted/60 border border-primary/15 size-12 flex items-center justify-center rounded-xl mb-5 text-primary">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-display font-semibold lowercase tracking-tight leading-snug mb-2">
                                    {feature.title.toLowerCase()}
                                </h3>
                                <p className="font-body text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </SpotlightCard>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeatureGrid;
