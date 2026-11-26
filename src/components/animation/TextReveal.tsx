import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { prefersReducedMotion } from '@/lib/motion';
import { ReactNode } from 'react';
// react-doctor-disable no-multi-comp

interface TextRevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    animation?: 'fade-up' | 'slide-left' | 'slide-right' | 'scale' | 'blur';
    duration?: number;
}

/**
 * Text reveal component with scroll-triggered animations
 */
export const TextReveal = ({
    children,
    className = '',
    delay = 0,
    animation = 'fade-up',
    duration = 0.6,
}: TextRevealProps) => {
    const isReduced = prefersReducedMotion();
    const { ref, isVisible } = useScrollAnimation({
        threshold: 0.1,
        triggerOnce: true,
    });

    const animationClasses = {
        'fade-up': 'animate-fade-up',
        'slide-left': 'animate-slide-in-left',
        'slide-right': 'animate-slide-in-right',
        'scale': 'animate-scale-in',
        // 'blur' deprecated: filter-blur animation is not compositor-safe - use opacity fade instead
        'blur': 'animate-fade-up',
    };

    const visible = isReduced || isVisible;

    return (
        <div
            ref={ref}
            className={`${className} ${isReduced ? '' : visible ? animationClasses[animation] : 'opacity-0'}`}
            style={
                isReduced
                    ? undefined
                    : {
                        animationDelay: `${delay}ms`,
                        animationDuration: `${duration}s`,
                        animationFillMode: 'both',
                    }
            }
        >
            {children}
        </div>
    );
};

interface SplitTextRevealProps {
    text: string;
    className?: string;
    wordDelay?: number;
    animation?: 'fade-up' | 'slide-up';
}

/**
 * Split text reveal with word-by-word animation
 */
export const SplitTextReveal = ({
    text,
    className = '',
    wordDelay = 50,
    animation = 'fade-up',
}: SplitTextRevealProps) => {
    const isReduced = prefersReducedMotion();
    const { ref, isVisible } = useScrollAnimation({
        threshold: 0.2,
        triggerOnce: true,
    });

    const words = text.split(' ');
    const visible = isReduced || isVisible;

    return (
        <div ref={ref} className={className}>
            {words.map((word, index) => (
                <span
                    key={`${word}-${index}`}
                    className={`inline-block ${isReduced ? '' : visible ? `animate-${animation}` : 'opacity-0'}`}
                    style={
                        isReduced
                            ? undefined
                            : {
                                animationDelay: `${index * wordDelay}ms`,
                                animationFillMode: 'both',
                            }
                    }
                >
                    {word}
                    {index < words.length - 1 && '\u00A0'}
                </span>
            ))}
        </div>
    );
};

interface GradientTextRevealProps {
    children: ReactNode;
    className?: string;
    gradient?: string;
}

/**
 * Gradient text with scroll-triggered reveal
 */
export const GradientTextReveal = ({
    children,
    className = '',
    gradient = 'from-primary to-accent',
}: GradientTextRevealProps) => {
    const isReduced = prefersReducedMotion();
    const { ref, isVisible } = useScrollAnimation({
        threshold: 0.1,
        triggerOnce: true,
    });

    const visible = isReduced || isVisible;

    return (
        <span
            ref={ref}
            className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${
                isReduced ? '' : visible ? 'animate-gradient-shift' : 'opacity-0'
            } ${className}`}
            style={
                isReduced
                    ? undefined
                    : {
                        animationFillMode: 'both',
                    }
            }
        >
            {children}
        </span>
    );
};
