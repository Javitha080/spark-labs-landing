import { useRef, useState, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Users, Briefcase, Award, Zap } from "lucide-react";

// Counter Hook
const useCounter = (end: number, duration: number = 2000, start: boolean = false) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!start) return;

        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            setCount(Math.floor(progress * end));

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [end, duration, start]);

    return count;
};

const StatItem = ({ icon: Icon, value, label, delay }: { icon: any, value: number, label: string, delay: number }) => {
    const { ref, isVisible } = useScrollAnimation();
    const count = useCounter(value, 2000, isVisible);

    return (
        <div
            ref={ref}
            className={`
                relative group p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm
                hover:border-primary/50 transition-all duration-500
                flex flex-col items-center justify-center text-center
                ${isVisible ? 'animate-fade-up' : 'opacity-0'}
            `}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 relative z-10">
                <Icon className="w-8 h-8 text-primary" />
            </div>

            <div className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary relative z-10">
                {count}+
            </div>

            <div className="text-muted-foreground font-medium relative z-10">
                {label}
            </div>
        </div>
    );
};

const Impact = () => {
    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-muted/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Our <span className="text-primary">Impact</span></h2>
                    <p className="text-lg text-muted-foreground">
                        From small classroom ideas to national recognition, see how our society is making a difference.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatItem icon={Users} value={100} label="Active Members" delay={0} />
                    <StatItem icon={Briefcase} value={50} label="Projects Completed" delay={100} />
                    <StatItem icon={Award} value={15} label="Awards Won" delay={200} />
                    <StatItem icon={Zap} value={5} label="Years of Innovation" delay={300} />
                </div>
            </div>
        </section>
    );
};

export default Impact;
