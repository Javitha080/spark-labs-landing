import { useEffect, useState } from "react";

/**
 * useSiteFooterInView - shared IntersectionObserver over the site footer
 * (`[data-site-footer]`, set by src/components/Footer.tsx).
 *
 * Floating controls (the Innovation Assistant FAB, ScrollToTop) use it to
 * get out of the way while the footer is on screen, so they never sit on
 * top of the animated footer art. One observer serves every consumer.
 */
let observer: IntersectionObserver | null = null;
let observedEl: Element | null = null;
let inView = false;
const listeners = new Set<(inView: boolean) => void>();

const emit = (value: boolean) => {
  inView = value;
  listeners.forEach((listener) => listener(value));
};

const observeFooter = () => {
  const footer = document.querySelector("[data-site-footer]");
  if (!footer || !observer) return;

  // Page navigation mounts a fresh Footer: swap the observed node.
  if (observedEl !== footer) {
    if (observedEl) observer.unobserve(observedEl);
    observer.observe(footer);
    observedEl = footer;
  }
};

const ensureObserver = () => {
  if (observer || typeof window === "undefined") return;
  // jsdom and legacy browsers ship no IntersectionObserver: skip footer
  // tracking entirely and report "not in view" (FABs stay visible).
  if (typeof IntersectionObserver === "undefined") return;
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (entry) emit(entry.isIntersecting);
    },
    { threshold: 0.3 },
  );
};

export const useSiteFooterInView = () => {
  const [footerInView, setFooterInView] = useState(inView);

  useEffect(() => {
    listeners.add(setFooterInView);
    ensureObserver();
    observeFooter();

    return () => {
      listeners.delete(setFooterInView);
      if (listeners.size === 0 && observer) {
        observer.disconnect();
        observer = null;
        observedEl = null;
        inView = false;
        emit(false);
      }
    };
  }, []);

  return footerInView;
};
