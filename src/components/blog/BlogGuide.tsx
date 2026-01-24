import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Sparkles, BookOpen, Eye,
    Palette, Type, ArrowRight, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlogGuideProps {
    onExplore: () => void;
}

export const BlogGuide = ({ onExplore }: BlogGuideProps) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Only show if not seen before
        const hasSeenGuide = localStorage.getItem("blog_reading_guide_seen");
        if (!hasSeenGuide) {
            const timer = setTimeout(() => setIsOpen(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem("blog_reading_guide_seen", "true");
    };

    const handleExplore = () => {
        handleDismiss();
        // Give a tiny moment for the modal to start closing
        setTimeout(onExplore, 50);
    };

    const features = [
        {
            icon: <Palette className="w-5 h-5 text-purple-400" />,
            title: "Themes",
            desc: "Sepia, AMOLED, & Paper modes for eye comfort."
        },
        {
            icon: <Type className="w-5 h-5 text-blue-400" />,
            title: "Typography",
            desc: "Adjust size, spacing & content width."
        },
        {
            icon: <Eye className="w-5 h-5 text-green-400" />,
            title: "Focus Mode",
            desc: "Dim distractions and focus on the content."
        },
        {
            icon: <BookOpen className="w-5 h-5 text-orange-400" />,
            title: "Accessiblity",
            desc: "OpenDyslexic font and reduced motion support."
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 overflow-hidden">
                    {/* Dark Backdrop with intense blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        onClick={handleDismiss}
                    />

                    {/* Premium Card Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-[440px] max-h-[90vh] flex flex-col bg-zinc-950 rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/10"
                    >
                        {/* Animated Background Orbs */}
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none opacity-60" />
                        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none opacity-60" />

                        {/* Close Action */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/10"
                            aria-label="Close guide"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* 1. Card Header - Fixed */}
                        <div className="relative p-6 sm:p-8 pb-4">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-[9px] sm:text-[10px] font-bold text-primary uppercase tracking-widest mb-3 sm:mb-4"
                            >
                                <Sparkles className="w-2.5 h-2.5 sm:w-3 h-3" />
                                <span>Premium Feature</span>
                            </motion.div>
                            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight mb-2 sm:mb-3">
                                Read Your Way.
                            </h2>
                            <p className="text-zinc-400 text-xs sm:text-base leading-relaxed max-w-[95%] font-medium">
                                Explore our immersive reading tools designed for your ultimate comfort.
                            </p>
                        </div>

                        {/* 2. Scrollable Features List */}
                        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-2 space-y-3 custom-scrollbar">
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 pb-6">
                                {features.map((f, i) => (
                                    <motion.div
                                        key={f.title}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 + i * 0.08 }}
                                        className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-primary/40 transition-all duration-300 group flex items-start gap-3 xs:block"
                                    >
                                        <div className="xs:mb-3 p-2 w-fit rounded-lg sm:rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform shadow-inner shrink-0">
                                            {f.icon}
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5 sm:mb-1">{f.title}</h3>
                                            <p className="text-[10px] sm:text-[11px] text-zinc-500 leading-snug">{f.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Dynamic Footer Area - Fixed */}
                        <div className="p-6 sm:p-8 pt-4 sm:pt-6 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl mt-auto">
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <Button
                                    onClick={handleExplore}
                                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 sm:h-14 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold shadow-2xl shadow-primary/20 group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        Customize Experience
                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </Button>

                                <div className="flex items-center justify-center sm:justify-start gap-2 text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-bold py-1">
                                    <span className="opacity-70">Look for the</span>
                                    <div className="p-1 rounded bg-white/5 border border-white/10 text-primary animate-pulse">
                                        <Settings2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </div>
                                    <span className="opacity-70">icon anytime</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
