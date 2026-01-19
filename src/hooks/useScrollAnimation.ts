import { useEffect, useRef, useState, RefObject } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface ScrollAnimationReturn {
  ref: RefObject<HTMLDivElement>;
  isVisible: boolean;
  hasAnimated: boolean;
}

/**
 * Custom hook for scroll-based animations using Intersection Observer API
 * @param options - Configuration options for intersection observer
 * @returns Object containing ref to attach to element, visibility state, and animation state
 */
export const useScrollAnimation = (
  options: UseScrollAnimationOptions = {}
): ScrollAnimationReturn => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;

        if (visible) {
          setIsVisible(true);
          if (!hasAnimated) {
            setHasAnimated(true);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce, hasAnimated]);

  return { ref, isVisible, hasAnimated };
};

/**
 * Hook for parallax scroll effects
 * @param speed - Parallax speed multiplier (default: 0.5)
 * @returns Object containing ref and transform style
 */
export const useParallax = (speed: number = 0.5) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let requestRef: number;

    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const parallaxOffset = scrollProgress * 100 * speed;

      setOffset(parallaxOffset);
    };

    const onScroll = () => {
      cancelAnimationFrame(requestRef);
      requestRef = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(requestRef);
    };
  }, [speed]);

  return {
    ref,
    style: {
      transform: `translate3d(0, ${offset}px, 0)`,
    },
  };
};

/**
 * Hook to track scroll direction
 * @returns Scroll direction ('up' | 'down' | null)
 */
export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let requestRef: number;
    let ticking = false;

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY) {
        setScrollDirection('up');
      }

      setLastScrollY(currentScrollY);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestRef = requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(requestRef);
    };
  }, [lastScrollY]);

  return scrollDirection;
};

/**
 * Hook to get scroll progress (0-1) for current page
 * @returns Scroll progress as a decimal between 0 and 1
 */
export const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let requestRef: number;
    let ticking = false;

    const updateProgress = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = documentHeight > 0 ? scrolled / documentHeight : 0;

      setProgress(Math.min(Math.max(progress, 0), 1));
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestRef = requestAnimationFrame(updateProgress);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateProgress(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(requestRef);
    };
  }, []);

  return progress;
};
