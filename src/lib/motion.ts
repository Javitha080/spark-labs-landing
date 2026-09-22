/**
 * Shared motion helpers.
 *
 * Every scroll-driven effect in the app funnels through these so that
 * reduced-motion users, touch devices and the admin CMS get consistent
 * (and cheap) behaviour instead of each component re-deriving it.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isTouchLike(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
  );
}

/** Coarse "this device will struggle with heavy scroll effects" check. */
export function isLowPowerDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof cores === "number" && cores > 0 && cores <= 4) return true;
  if (typeof memory === "number" && memory > 0 && memory <= 4) return true;
  return false;
}

/**
 * Reveal animations must never be able to leave content permanently
 * invisible. Effects that start at `opacity: 0` register a watchdog: if the
 * element has not been revealed by the time this fires, we force it visible.
 */
export function revealWatchdog(el: HTMLElement | null, timeoutMs = 2500) {
  if (!el) return () => {};
  const timer = window.setTimeout(() => {
    const opacity = Number.parseFloat(getComputedStyle(el).opacity || "1");
    if (Number.isFinite(opacity) && opacity < 0.05) {
      el.style.opacity = "1";
      el.style.transform = "none";
    }
    el.style.willChange = "auto";
  }, timeoutMs);
  return () => window.clearTimeout(timer);
}
