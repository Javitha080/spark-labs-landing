import { useScrollProgress } from '@/hooks/useScrollAnimation';

/**
 * Scroll progress indicator component
 */
export const ScrollProgress = () => {
    const progress = useScrollProgress();

    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/20">
            <div
                className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-150 ease-out"
                style={{ width: `${progress * 100}%` }}
            />
        </div>
    );
};
