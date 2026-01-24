import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Sparkles, BookOpen, Eye,
    Palette, Type, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlogGuideProps {
    onExplore: () => void;
}

export const BlogGuide = ({ onExplore }: BlogGuideProps) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if guide has been seen
        const hasSeenGuide = localStorage.getItem("blog_reading_guide_seen");
        if (!hasSeenGuide) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem("blog_reading_guide_seen", "true");
    };

    const handleExplore = () => {
        handleDismiss();
        onExplore();
    };

    const features = [
        {
            icon: <Palette className="w-5 h-5 text-purple-400" />,
            title: "Immersive Themes",
            desc: "Switch between Sepia, AMOLED, and Paper modes for eye comfort."
        },
        {
            icon: <Type className="w-5 h-5 text-blue-400" />,
            title: "Custom Typography",
            desc: "Adjust font size, line spacing, and content width to your liking."
        },
        {
            icon: <Eye className="w-5 h-5 text-green-400" />,
            title: "Focus Mode",
            desc: "Dim distractions and focus purely on the content."
        },
        {
            icon: <BookOpen className="w-5 h-5 text-orange-400" />,
            title: "Accessibility",
            desc: "OpenDyslexic font and reduced motion support included."
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 overflow-hidden"
                        onClick={handleDismiss}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
                            {/* Decorative gradient blob */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                            <div className="relative p-6 sm:p-8">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="space-y-1">
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-2"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            <span>New Experience</span>
                                        </motion.div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">
                                            Enhanced Reading Mode
                                        </h2>
                                        <p className="text-muted-foreground text-sm">
                                            We've rebuilt the reading experience with your comfort in mind.
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleDismiss}
                                        className="text-muted-foreground hover:text-white hover:bg-white/10 -mt-2 -mr-2"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Features Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                    {features.map((feature, idx) => (
                                        <motion.div
                                            key={feature.title}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 + idx * 0.1 }}
                                            className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="mb-2 p-2 w-fit rounded-lg bg-black/20">
                                                {feature.icon}
                                            </div>
                                            <h3 className="text-sm font-semibold text-white mb-1">
                                                {feature.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {feature.desc}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        onClick={handleExplore}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 h-11"
                                    >
                                        Customize My Experience
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleDismiss}
                                        className="flex-1 border-white/10 hover:bg-white/5 hover:text-white h-11"
                                    >
                                        Maybe Later
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
