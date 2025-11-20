import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { ReactNode } from 'react';

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
    const { ref, isVisible } = useScrollAnimation({
        threshold: 0.1,
        triggerOnce: true,
    });

    const animationClasses = {
        'fade-up': 'animate-fade-up',
        'slide-left': 'animate-slide-in-left',
        'slide-right': 'animate-slide-in-right',
        'scale': 'animate-scale-in',
        'blur': 'animate-blur-in',
    };

    return (
        <div
            ref={ref}
            className={`${className} ${isVisible ? animationClasses[animation] : 'opacity-0'}`}
            style={{
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}s`,
                animationFillMode: 'both',
            }}
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
    const { ref, isVisible } = useScrollAnimation({
        threshold: 0.2,
        triggerOnce: true,
    });

    const words = text.split(' ');

    return (
        <div ref={ref} className={className}>
            {words.map((word, index) => (
                <span
                    key={index}
                    className={`inline-block ${isVisible ? `animate-${animation}` : 'opacity-0'}`}
                    style={{
                        animationDelay: `${index * wordDelay}ms`,
                        animationFillMode: 'both',
                    }}
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
    gradient = 'from-primary via-secondary to-accent',
}: GradientTextRevealProps) => {
    const { ref, isVisible } = useScrollAnimation({
        threshold: 0.1,
        triggerOnce: true,
    });

    return (
        <span
            ref={ref}
            className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${isVisible ? 'animate-gradient-shift' : 'opacity-0'
                } ${className}`}
            style={{
                animationFillMode: 'both',
            }}
        >
            {children}
        </span>
    );
};
