import type { ReactNode } from "react";
import AnimatedContent, {
    type AnimatedContentProps,
} from "@/components/reactbits/AnimatedContent";
import { prefersReducedMotion } from "@/lib/motion";

interface RevealProps extends AnimatedContentProps {
    children: ReactNode;
}

/**
 * Reduced-motion aware wrapper over ReactBits AnimatedContent.
 * Content renders immediately in place when the OS asks for reduced
 * motion; otherwise the scroll-triggered entrance plays once.
 */
export default function Reveal({ children, ...props }: RevealProps) {
    if (prefersReducedMotion()) return <>{children}</>;
    return <AnimatedContent {...props}>{children}</AnimatedContent>;
}
