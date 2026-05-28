/**
 * anime.js v4 wrapper with reduced-motion safety + viewport gating.
 * Coexists with framer-motion — used for fine-grained, performant tweens.
 */
import { animate, stagger, createTimeline, utils } from "animejs";
import { useEffect, useRef, type RefObject } from "react";

export { animate, stagger, createTimeline, utils };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnimeParams = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnimeTarget = any;

interface AnimeBuild {
  target: AnimeTarget;
  params: AnimeParams;
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

interface UseAnimeOptions {
  whenInView?: boolean;
  repeatOnEnter?: boolean;
  threshold?: number;
  skip?: boolean;
}

/**
 * Hook to run an anime.js animation tied to a ref's lifecycle.
 * The builder returns either { target, params } or an array of those.
 * - Auto-respects prefers-reduced-motion (jumps to final state, no tween).
 * - Auto-cleanup on unmount.
 * - Optional in-view gating.
 */
export function useAnime<T extends HTMLElement = HTMLElement>(
  buildParams: (el: T) => AnimeBuild | AnimeBuild[] | null,
  deps: ReadonlyArray<unknown> = [],
  options: UseAnimeOptions = {}
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || options.skip) return;

    const reduced = prefersReducedMotion();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const run = (): any[] => {
      try {
        const result = buildParams(el);
        if (!result) return [];
        const list = Array.isArray(result) ? result : [result];
        return list
          .flatMap(({ target, params }) => {
            try {
              const final = reduced ? { ...params, duration: 0, delay: 0 } : params;
              return [animate(target, final)];
            } catch (err) {
              if (import.meta.env.DEV) console.warn("[useAnime] animate failed:", err);
              return [];
            }
          });
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[useAnime] build failed:", err);
        return [];
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instances: any[] = [];

    if (!options.whenInView) {
      instances = run();
      return () => {
        instances.forEach((i) => i?.pause?.());
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            instances = run();
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
