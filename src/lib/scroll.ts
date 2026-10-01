import type Lenis from "lenis";

/**
 * Programmatic scrolling that stays in sync with Lenis.
 *
 * When Lenis owns the scroll (public pages on any device), calling
 * `window.scrollTo({ behavior: "smooth" })` or `scrollIntoView` starts a
 * second, native animation that fights Lenis's own easing. Everything that
 * scrolls from code goes through here instead; on routes where Lenis is
 * disabled (admin, student portal) it falls back to the native API.
 */

type LenisWindow = Window & { lenis?: Lenis };

/** Offset that clears the fixed pill header. Negative = stop above the target. */
export const HEADER_OFFSET = -96;

/**
 * Lenis writes its own debug object ({ version, touch }) to `window.lenis` from
 * inside its constructor, so `window.lenis` is NOT a reliable handle on the
 * instance: for a moment after construction it is a plain object without
 * `scrollTo`/`stop`/`start`. The app keeps its own reference instead and only
 * mirrors it to `window.lenis` for debugging and console use.
 */
let current: Lenis | undefined;

export function getLenis(): Lenis | undefined {
  return current;
}

export function setGlobalLenis(instance: Lenis | undefined) {
  current = instance;
  if (typeof window === "undefined") return;
  const w = window as LenisWindow;
  if (instance) w.lenis = instance;
  else delete w.lenis;
}

export interface ScrollToTargetOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
}

type Target = string | number | HTMLElement | null | undefined;

function resolve(target: Target): HTMLElement | number | null {
  if (target == null) return null;
  if (typeof target === "number") return target;
  if (typeof target === "string") {
    return document.getElementById(target.replace(/^#/, "")) ?? document.querySelector<HTMLElement>(target);
  }
  return target;
}

export function scrollToTarget(target: Target, options: ScrollToTargetOptions = {}): void {
  const resolved = resolve(target);
  if (resolved == null) return;

  const { offset = typeof resolved === "number" ? 0 : HEADER_OFFSET, immediate = false, duration } = options;
  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(resolved, { offset, immediate, duration, force: immediate });
    return;
  }

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = immediate ? "instant" : reduced ? "auto" : "smooth";
  const top =
    typeof resolved === "number"
      ? resolved
      : resolved.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior });
}

export function scrollToTop(options: Omit<ScrollToTargetOptions, "offset"> = {}): void {
  scrollToTarget(0, { ...options, offset: 0 });
}
