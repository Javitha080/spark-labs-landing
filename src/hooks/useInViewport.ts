import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * useInViewport — IntersectionObserver hook with rootMargin pre-warming.
 * Use this to lazy-mount heavy media (iframes, videos) only when near the viewport.
 */
export function useInViewport<T extends Element = HTMLDivElement>(
  options: {
    rootMargin?: string;
    threshold?: number;
    once?: boolean;
  } = {}
): { ref: RefObject<T>; inView: boolean } {
  const { rootMargin = "200px", threshold = 0, once = false } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  // react-doctor-disable no-adjust-state-on-prop-change
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}
