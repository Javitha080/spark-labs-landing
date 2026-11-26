import { useEffect, useRef, useState, RefObject } from 'react';
import { prefersReducedMotion, revealWatchdog } from '@/lib/motion';

export { revealWatchdog };

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  watchdogMs?: number;
}

interface ScrollAnimationReturn {
  ref: RefObject<HTMLDivElement>;
  isVisible: boolean;
  hasAnimated: boolean;
}

/* ─── Shared IntersectionObserver Pool + Coalesced Scroll Watchdog ─────────── */
type ElementCallback = (isIntersecting: boolean) => void;

interface PooledObserver {
  Ctor: typeof IntersectionObserver;
  observer: IntersectionObserver;
  targets: Map<Element, ElementCallback>;
}

const observerPool = new Map<string, PooledObserver>();
const pendingWatchdogs = new Map<HTMLElement, () => void>();
let scrollWatchdogRaf = 0;
let scrollWatchdogAttached = false;

function runCoalescedWatchdogPass() {
  scrollWatchdogRaf = 0;
  if (pendingWatchdogs.size === 0) return;
  const viewHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const limit = viewHeight * 1.15;
  const revealedNow: Array<() => void> = [];

  pendingWatchdogs.forEach((triggerReveal, el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= limit) {
      revealedNow.push(triggerReveal);
    }
  });

  for (const fn of revealedNow) fn();
}

function onSharedWatchdogScroll() {
  if (scrollWatchdogRaf || pendingWatchdogs.size === 0) return;
  scrollWatchdogRaf = window.requestAnimationFrame(runCoalescedWatchdogPass);
}

function registerWatchdogTarget(el: HTMLElement, triggerReveal: () => void) {
  pendingWatchdogs.set(el, triggerReveal);
  if (!scrollWatchdogAttached && typeof window !== 'undefined') {
    scrollWatchdogAttached = true;
    window.addEventListener('scroll', onSharedWatchdogScroll, { passive: true });
  }
}

function unregisterWatchdogTarget(el: HTMLElement) {
  pendingWatchdogs.delete(el);
  if (pendingWatchdogs.size === 0 && scrollWatchdogAttached && typeof window !== 'undefined') {
    scrollWatchdogAttached = false;
    window.removeEventListener('scroll', onSharedWatchdogScroll);
    if (scrollWatchdogRaf) {
      window.cancelAnimationFrame(scrollWatchdogRaf);
      scrollWatchdogRaf = 0;
    }
  }
}

function observePooled(
  element: Element,
  threshold: number,
  rootMargin: string,
  cb: ElementCallback,
): () => void {
  const key = `${threshold}|${rootMargin}`;
  let entry = observerPool.get(key);

  // Recreate if globalThis.IntersectionObserver changed (e.g. unit test mocks).
  if (!entry || entry.Ctor !== IntersectionObserver) {
    if (entry) entry.observer.disconnect();
    const targets = new Map<Element, ElementCallback>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const item of entries) {
          targets.get(item.target)?.(item.isIntersecting);
        }
      },
      { threshold, rootMargin },
    );
    entry = { Ctor: IntersectionObserver, observer, targets };
    observerPool.set(key, entry);
  }

  entry.targets.set(element, cb);
  entry.observer.observe(element);

  return () => {
    const current = observerPool.get(key);
    if (!current) return;
    current.targets.delete(element);
    current.observer.unobserve(element);
    if (current.targets.size === 0) {
      current.observer.disconnect();
      observerPool.delete(key);
    }
  };
}

/**
 * Custom hook for scroll-based animations using a shared IntersectionObserver
 * pool and a single coalesced rAF scroll watchdog (eliminating per-card scroll
 * listeners and synchronous getBoundingClientRect thrashing).
 */
export const useScrollAnimation = (
  options: UseScrollAnimationOptions = {}
): ScrollAnimationReturn => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    watchdogMs = 2500,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const noObserver = typeof IntersectionObserver === 'undefined';
  const staticReveal = prefersReducedMotion() || noObserver;
  const [isVisible, setIsVisible] = useState(staticReveal);
  const [hasAnimated, setHasAnimated] = useState(staticReveal);
  const hasAnimatedRef = useRef(staticReveal);

  // react-doctor-disable no-adjust-state-on-prop-change
  useEffect(() => {
    const element = ref.current;
    if (!element || staticReveal) return;

    let cancelDomWatchdog: (() => void) | null = null;
    let stopObserving: (() => void) | null = null;

    const reveal = () => {
      setIsVisible(true);
      if (!hasAnimatedRef.current) {
        hasAnimatedRef.current = true;
        setHasAnimated(true);
      }
      unregisterWatchdogTarget(element);
      if (triggerOnce) {
        stopObserving?.();
        stopObserving = null;
      }
    };

    stopObserving = observePooled(element, threshold, rootMargin, (intersecting) => {
      if (intersecting) {
        reveal();
      } else if (!triggerOnce) {
        setIsVisible(false);
      }
    });

    const checkViewportAndReveal = () => {
      if (hasAnimatedRef.current) return;
      const rect = element.getBoundingClientRect();
      const viewHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      if (rect.top <= viewHeight * 1.15) {
        reveal();
        cancelDomWatchdog = revealWatchdog(element, 500);
      }
    };

    const watchdogTimer = window.setTimeout(checkViewportAndReveal, watchdogMs);
    registerWatchdogTarget(element, () => {
      reveal();
      cancelDomWatchdog = revealWatchdog(element, 500);
    });

    return () => {
      window.clearTimeout(watchdogTimer);
      unregisterWatchdogTarget(element);
      cancelDomWatchdog?.();
      stopObserving?.();
    };
  }, [staticReveal, threshold, rootMargin, triggerOnce, watchdogMs]);

  return { ref, isVisible, hasAnimated };
};

/**
 * Hook for parallax scroll effects
 */
export const useParallax = (speed: number = 0.5) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let requestRef = 0;
    if (prefersReducedMotion()) return;

    const handleScroll = () => {
      requestRef = 0;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const parallaxOffset = scrollProgress * 100 * speed;
      ref.current.style.transform = `translate3d(0, ${parallaxOffset.toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (!requestRef) requestRef = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (requestRef) cancelAnimationFrame(requestRef);
    };
  }, [speed]);

  return { ref, style: { willChange: 'transform' as const } };
};

/**
 * Hook to track scroll direction
 */
export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let requestRef = 0;
    let ticking = false;

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setScrollDirection((prev) => (prev === 'down' ? prev : 'down'));
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection((prev) => (prev === 'up' ? prev : 'up'));
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
    let requestRef = 0;
    let ticking = false;

    const updateProgress = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const next = documentHeight > 0 ? scrolled / documentHeight : 0;
      setProgress(Math.min(Math.max(next, 0), 1));
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
