/**
 * anime.js v4 wrapper with reduced-motion safety + viewport gating.
 * Coexists with framer-motion — used for fine-grained, performant tweens.
 */
import { animate, stagger, createTimeline, utils, type AnimationParams } from "animejs";
import { useEffect, useRef, type RefObject } from "react";

export { animate, stagger, createTimeline, utils };

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

interface UseAnimeOptions {
  /** Only run when the element scrolls into view */
  whenInView?: boolean;
  /** Re-run on every entry (default false = once) */
  repeatOnEnter?: boolean;
  /** IntersectionObserver threshold */
  threshold?: number;
  /** Skip entirely (useful for conditional flows) */
  skip?: boolean;
}

/**
 * Hook to run an anime.js animation tied to a ref's lifecycle.
 * - Auto-respects prefers-reduced-motion (applies final state, no tween).
 * - Auto-cleanup on unmount.
 * - Optional in-view gating.
 */
export function useAnime<T extends HTMLElement = HTMLElement>(
  buildParams: (el: T) => AnimationParams | AnimationParams[] | null,
  deps: ReadonlyArray<unknown> = [],
  options: UseAnimeOptions = {}
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || options.skip) return;

    const reduced = prefersReducedMotion();

    const run = () => {
      try {
        const params = buildParams(el);
        if (!params) return [];
        const list = Array.isArray(params) ? params : [params];
        return list
          .map((p) => {
            try {
              if (reduced) {
                // Skip animation, jump straight to final state if possible.
                return animate(el, { ...p, duration: 0, delay: 0 });
              }
              return animate(el, p);
            } catch (err) {
              if (import.meta.env.DEV) console.warn("[useAnime] animate failed:", err);
              return null;
            }
          })
          .filter(Boolean);
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[useAnime] build failed:", err);
        return [];
      }
    };

    let instances: ReturnType<typeof animate>[] = [];

    if (!options.whenInView) {
      instances = run() as ReturnType<typeof animate>[];
      return () => {
        instances.forEach((i) => i?.pause?.());
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            instances = run() as ReturnType<typeof animate>[];
            if (!options.repeatOnEnter) observer.disconnect();
          } else if (options.repeatOnEnter) {
            instances.forEach((i) => i?.pause?.());
            instances = [];
          }
        }
      },
      { threshold: options.threshold ?? 0.15 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      instances.forEach((i) => i?.pause?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
