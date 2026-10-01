import { m, useInView, Variants } from "framer-motion";
import { useRef, ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// Reveal slightly before the element's edge reaches the viewport so content is
// already in place by the time the reader gets to it (no "pop in" on fast
// scrolls), and so tall sections can't sit below the amount threshold.
const REVEAL_MARGIN = "0px 0px -12% 0px";

// Visitors who asked for reduced motion get the final state immediately.
const reduced = () => prefersReducedMotion();

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
    const isInView = useInView(ref, { once, amount: threshold, margin: REVEAL_MARGIN }) || reduced();

    return (
        <m.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </m.div>
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
    const isInView = useInView(ref, { once, amount: threshold, margin: REVEAL_MARGIN }) || reduced();

    return (
        <m.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration, delay, type: "spring", stiffness: 200, damping: 20 }}
            className={className}
        >
            {children}
        </m.div>
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
    const isInView = useInView(ref, { once, amount: threshold, margin: REVEAL_MARGIN }) || reduced();
    const xOffset = direction === "left" ? -60 : 60;

    return (
        <m.div
            ref={ref}
            initial={{ opacity: 0, x: xOffset }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: xOffset }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </m.div>
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
    const isInView = useInView(ref, { once, amount: threshold, margin: REVEAL_MARGIN }) || reduced();

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
        <m.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className={className}
        >
            {children}
        </m.div>
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
        <m.div variants={itemVariants} className={className}>
            {children}
        </m.div>
    );
};

// Text reveal with word split (much lighter than per-character)
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
    const isInView = useInView(ref, { once: true, amount: threshold, margin: REVEAL_MARGIN }) || reduced();

    return (
        <span ref={ref} className={`inline-block ${className}`}>
            {text.split(" ").map((word, i) => (
                <m.span
                    key={`${word}-${i}`}
                    className="inline-block mr-[0.25em]"
                    initial={{ opacity: 0, y: 15 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{
                        duration: reduced() ? 0 : 0.35,
                        delay: reduced() ? 0 : delay + i * 0.06,
                        ease: "easeOut",
                    }}
                >
                    {word}
                </m.span>
            ))}
        </span>
    );
};

// Section divider with gradient
export const SectionDivider = ({ className = "" }: { className?: string }) => (
    <div className={`w-full flex justify-center py-4 ${className}`}>
        <m.div
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
