import { motion, useInView, Variants } from "framer-motion";
import { useRef, ReactNode } from "react";

/* ===========================================
   SCROLL-TRIGGERED ANIMATION WRAPPERS
   Reusable components for scroll-based reveals
   =========================================== */

interface ScrollAnimationProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
}

// Fade + Slide Up
export const FadeInOnScroll = ({
    children,
    className = "",
    delay = 0,
    duration = 0.6,
    threshold = 0.15,
    once = true,
}: ScrollAnimationProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once, amount: threshold });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Stagger Children Container
export const StaggerChildren = ({
    children,
    className = "",
    delay = 0,
    staggerDelay = 0.1,
    threshold = 0.1,
    once = true,
}: ScrollAnimationProps & { staggerDelay?: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once, amount: threshold });

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                delayChildren: delay,
                staggerChildren: staggerDelay,
            },
        },
    };

    return (
        <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Individual stagger child item
export const StaggerItem = ({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) => {
    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" },
        },
    };

    return (
        <motion.div variants={itemVariants} className={className}>
            {children}
        </motion.div>
    );
};

// Section divider with gradient
export const SectionDivider = ({ className = "" }: { className?: string }) => (
    <div className={`w-full flex justify-center py-4 ${className}`}>
        <motion.div
            className="h-px w-full max-w-md"
            style={{
                background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)",
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
        />
    </div>
);
