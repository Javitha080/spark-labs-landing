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
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Scale In
export const ScaleInOnScroll = ({
    children,
    className = "",
    delay = 0,
    duration = 0.5,
    threshold = 0.15,
    once = true,
}: ScrollAnimationProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once, amount: threshold });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration, delay, type: "spring", stiffness: 200, damping: 20 }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Slide from Left or Right
export const SlideInOnScroll = ({
    children,
    className = "",
    delay = 0,
    duration = 0.6,
    threshold = 0.15,
    once = true,
    direction = "left",
}: ScrollAnimationProps & { direction?: "left" | "right" }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once, amount: threshold });
    const xOffset = direction === "left" ? -60 : 60;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: xOffset }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
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
        hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.5, ease: "easeOut" },
        },
    };

    return (
        <motion.div variants={itemVariants} className={className}>
            {children}
        </motion.div>
    );
};

// Text reveal with character split
export const TextRevealOnScroll = ({
    text,
    className = "",
    delay = 0,
    threshold = 0.2,
}: {
    text: string;
    className?: string;
    delay?: number;
    threshold?: number;
}) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, amount: threshold });

    return (
        <span ref={ref} className={`inline-block ${className}`}>
            {text.split("").map((char, i) => (
                <motion.span
                    key={i}
                    className="inline-block"
                    initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                    animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                    transition={{
                        duration: 0.4,
                        delay: delay + i * 0.03,
                        ease: "easeOut",
                    }}
                >
                    {char === " " ? "\u00A0" : char}
                </motion.span>
            ))}
        </span>
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
