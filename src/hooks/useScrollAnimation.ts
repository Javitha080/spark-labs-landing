import { useEffect, useRef, useState, RefObject } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

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
  const hasAnimatedRef = useRef(false);

  // react-doctor-disable no-adjust-state-on-prop-change
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Reduced motion: reveal immediately, don't observe anything.
    if (prefersReducedMotion()) {
      setIsVisible(true);
      setHasAnimated(true);
      return;
    }

    // `hasAnimated` is tracked in a ref as well, so it can stay out of the
    // dependency list — including it tore down and rebuilt the observer on
    // every single reveal, which showed up as scroll stutter.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;

        if (visible) {
          setIsVisible(true);
          if (!hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            setHasAnimated(true);
          }
          if (triggerOnce) observer.unobserve(element);
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
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible, hasAnimated };
};

/**
 * Hook for parallax scroll effects
 * @param speed - Parallax speed multiplier (default: 0.5)
 * @returns Object containing ref and transform style
 */
export const useParallax = (speed: number = 0.5) => {
  const ref = useRef<HTMLDivElement>(null);

  // The transform is written straight to the node. Calling setState on every
  // scroll frame re-rendered the whole subtree ~60x/second and was a major
  // cause of scroll jank.
  useEffect(() => {
    let requestRef: number;
    if (prefersReducedMotion()) return;

    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const parallaxOffset = scrollProgress * 100 * speed;

      ref.current.style.transform = `translate3d(0, ${parallaxOffset}px, 0)`;
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

  return { ref, style: { willChange: 'transform' as const } };
};

/**
 * Hook to track scroll direction
 * @returns Scroll direction ('up' | 'down' | null)
 */
export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let requestRef: number;
    let ticking = false;

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up');
      }

      lastScrollY.current = currentScrollY;
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
  }, []);

  return scrollDirection;
};

/**
 * Hook to get scroll progress (0-1) for current page
 * @returns Scroll progress as a decimal between 0 and 1
 */
export const useScrollProgress = () => {
  const [progress, setProgress] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.scrollY;
    const p = documentHeight > 0 ? scrolled / documentHeight : 0;
    return Math.min(Math.max(p, 0), 1);
  });

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

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(requestRef);
    };
  }, []);

  return progress;
};
