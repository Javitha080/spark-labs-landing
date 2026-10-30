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
  const w = window as unknown as LenisWindow;
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

/** Scrolls to a target, stopping `HEADER_OFFSET` short of it. Returns the
    travel duration in ms so callers can schedule post-arrival work. */
export function scrollToTarget(target: Target, options: ScrollToTargetOptions = {}): number {
  const resolved = resolve(target);
  if (resolved == null) return 0;

  const { offset = typeof resolved === "number" ? 0 : HEADER_OFFSET, immediate = false, duration } = options;
  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(resolved, { offset, immediate, duration, force: immediate });
    return immediate ? 0 : (duration ?? 1100);
  }

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const top =
    typeof resolved === "number"
      ? resolved
      : resolved.getBoundingClientRect().top + window.scrollY + offset;

  if (immediate || reduced) {
    cancelScrollTween();
    window.scrollTo({ top, behavior: "instant" });
    return 0;
  }

  // Native smooth scrolling is out of our control: it transitions for
  // seconds over long distances and ScrollTrigger's refresh save/restore
  // dance can reset the page and kill the travel mid-flight. A short rAF
  // tween driven from here is deterministic and survives those resets
  // (each frame re-asserts the absolute target).
  return tweenScrollTo(top, duration);
}

export function scrollToTop(options: Omit<ScrollToTargetOptions, "offset"> = {}): void {
  scrollToTarget(0, { ...options, offset: 0 });
}

let tweenRaf = 0;
let tweenToken = 0;
let tweenCancelInput: (() => void) | null = null;

function cancelScrollTween(): void {
  tweenToken += 1;
  if (tweenRaf) cancelAnimationFrame(tweenRaf);
  tweenRaf = 0;
  if (tweenCancelInput) {
    window.removeEventListener("wheel", tweenCancelInput);
    window.removeEventListener("touchstart", tweenCancelInput);
    tweenCancelInput = null;
  }
}

function tweenScrollTo(topTarget: number, duration?: number): number {
  const startY = window.scrollY;
  const delta = topTarget - startY;
  if (Math.abs(delta) < 2) return 0;

  // Bump the token so any tween already running steps aside: interleaved
  // tweens fighting one tweenRaf handle produced yo-yo scroll fights.
  cancelScrollTween();
  const token = tweenToken + 1;
  tweenToken = token;
  const d =
    duration ??
    Math.min(1600, 420 + Math.abs(delta) * 0.14);
  if (d <= 0) {
    window.scrollTo({ top: topTarget, behavior: "instant" });
    return 0;
  }

  // Same easing family as the Lenis config in SmoothScroll.
  const ease = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));
  const started = performance.now();

  // Hand control back to the user the moment they scroll themselves.
  tweenCancelInput = () => cancelScrollTween();
  window.addEventListener("wheel", tweenCancelInput, { passive: true });
  window.addEventListener("touchstart", tweenCancelInput, { passive: true });

  const tick = (now: number) => {
    if (token !== tweenToken) return 0;
    const t = Math.min(1, (now - started) / d);
    window.scrollTo(0, Math.round(startY + delta * ease(t)));
    tweenRaf = t === 1 ? 0 : requestAnimationFrame(tick);
    return 0;
  };
  tweenRaf = requestAnimationFrame(tick);
  return d;
}
