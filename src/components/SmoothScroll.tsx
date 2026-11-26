import { useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { prefersReducedMotion } from '@/lib/motion';
import { setGlobalLenis } from '@/lib/scroll';
import { SECTIONS_HYDRATED_EVENT } from '@/components/loading/LazySection';

interface SmoothScrollProps {
  children: ReactNode;
}

type ScrollTriggerModule = typeof import('gsap/ScrollTrigger')['ScrollTrigger'];

/**
 * Lenis-powered smooth scrolling for public marketing pages.
 * Touch devices use native OS momentum (`syncTouch: false`) while
 * ScrollTrigger still tracks native scroll cleanly.
 *
 * Deliberately NOT enabled when:
 *  - the visitor asked for reduced motion, or
 *  - the route is an admin/student route, where long forms, dialogs and
 *    nested scroll containers fight the virtual scroller.
 *
 * Integration contract with GSAP (the canonical Lenis pattern):
 *   lenis.on('scroll', ScrollTrigger.update)   -> triggers inspect real scroll
 *   gsap.ticker.add((t) => lenis.raf(t * 1000)) -> one rAF loop drives Lenis
 *   ScrollTrigger.config({ ignoreMobileResize }) -> URL-bar hides don't thrash
 */
export default function SmoothScroll({ children }: SmoothScrollProps) {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/student');
  const stRef = useRef<ScrollTriggerModule | null>(null);

  // oxlint-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    let lenisInstance: { destroy: () => void; raf: (t: number) => void; on: (e: string, cb: () => void) => void } | undefined;
    let gsapInstance: typeof import('gsap')['gsap'] | undefined;
    let tickerCallback: ((time: number) => void) | undefined;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    const setupRefreshers = (ST: ScrollTriggerModule) => {
      // Mobile browsers resize the viewport when the URL bar hides; refreshing
      // on that causes visible jumps and dropped frames. limitCallbacks skips
      // firing off-screen trigger callbacks during initial ScrollTrigger setup.
      ST.config({ ignoreMobileResize: true, limitCallbacks: true });

      let coalesceTimer: number | undefined;
      const scheduleRefresh = (delayMs = 80) => {
        if (cancelled) return;
        window.clearTimeout(coalesceTimer);
        coalesceTimer = window.setTimeout(() => {
          if (!cancelled) ST.refresh();
        }, delayMs);
      };
      cleanups.push(() => window.clearTimeout(coalesceTimer));

      // Late-loading fonts and images shift layout - remeasure once settled.
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => !cancelled && scheduleRefresh(60)).catch(() => {});
      }
      if (document.readyState !== 'complete') {
        const onLoad = () => scheduleRefresh(80);
        window.addEventListener('load', onLoad, { once: true });
        cleanups.push(() => window.removeEventListener('load', onLoad));
      }

      const onHydrated = () => scheduleRefresh(80);
      window.addEventListener(SECTIONS_HYDRATED_EVENT, onHydrated);
      cleanups.push(() => window.removeEventListener(SECTIONS_HYDRATED_EVENT, onHydrated));

      const onResize = () => scheduleRefresh(250);
      window.addEventListener('resize', onResize, { passive: true });
      cleanups.push(() => {
        window.removeEventListener('resize', onResize);
      });

      // Lazy-loaded sections change document height after mount.
      const settle = window.setTimeout(() => scheduleRefresh(0), 1200);
      cleanups.push(() => window.clearTimeout(settle));
    };

    const init = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      gsapInstance = gsap;
      gsap.registerPlugin(ScrollTrigger);
      stRef.current = ScrollTrigger;
      setupRefreshers(ScrollTrigger);

      const skipSmooth = isAdminRoute || prefersReducedMotion();

      // Native scrolling everywhere smooth scrolling would hurt. ScrollTrigger
      // still works - it just listens to the real scroller.
      if (skipSmooth) return;

      const Lenis = await import('lenis').then((m) => m.default);
      if (cancelled) return;

      const touch = matchMedia('(pointer: coarse)').matches;

      lenisInstance = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: !touch,
        wheelMultiplier: 1.05,
        // Native OS momentum on touch; ScrollTrigger tracks native scroll
        syncTouch: false,
        // Radix primitives, cmdk, and command palette render floating,
        // scrollable overlays through these wrappers - leave them to native scroll.
        prevent: (node: Element) =>
          Boolean(
            node.closest?.(
              [
                '[data-lenis-prevent]',
                '[role="dialog"]',
                '[role="alertdialog"]',
                // Popover, dropdown-menu, select, hover-card, context-menu and
                // cmdk all render inside Radix's popper wrapper.
                '[data-radix-popper-content-wrapper]',
                '[data-radix-select-viewport]',
                '[cmdk-list]',
                '[data-command-list]',
                '[data-radix-scroll-area-viewport]',
              ].join(', '),
            ),
          ),
      } as never) as typeof lenisInstance;

      (window as unknown as { lenis?: unknown }).lenis = lenisInstance;
      setGlobalLenis(lenisInstance as never);
      lenisInstance!.on('scroll', ScrollTrigger.update);

      tickerCallback = (time: number) => lenisInstance?.raf(time * 1000);
      gsap.ticker.add(tickerCallback);
      // Keep GSAP's default lag smoothing: disabling it made a single slow
      // frame cascade into visible scroll stutter.
    };

    init();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      if (gsapInstance && tickerCallback) gsapInstance.ticker.remove(tickerCallback);
      if (lenisInstance) lenisInstance.destroy();
      setGlobalLenis(undefined);
      delete (window as unknown as { lenis?: unknown }).lenis;
    };
  }, [isAdminRoute]);

  // Refresh ScrollTrigger across SPA route changes & lazy section settles.
  useEffect(() => {
    const ST = stRef.current;
    if (!ST) return undefined;

    let disposed = false;
    let isRefreshing = false;
    let resizeDebounceId: number | undefined;
    let rafId = 0;

    const targetEl = document.querySelector('main') ?? document.body;
    let lastHeight = targetEl?.getBoundingClientRect().height ?? 0;

    const safeRefresh = () => {
      if (disposed || isRefreshing) return;
      isRefreshing = true;
      try {
        ST.refresh();
        lastHeight = targetEl?.getBoundingClientRect().height ?? lastHeight;
      } finally {
        isRefreshing = false;
      }
    };

    const scheduleDebouncedRefresh = (delayMs = 140) => {
      if (disposed) return;
      window.clearTimeout(resizeDebounceId);
      resizeDebounceId = window.setTimeout(safeRefresh, delayMs);
    };

    rafId = window.requestAnimationFrame(safeRefresh);
    const settleShort = window.setTimeout(safeRefresh, 250);
    const settleLong = window.setTimeout(safeRefresh, 1100);
    const onHydrated = () => scheduleDebouncedRefresh(80);
    window.addEventListener(SECTIONS_HYDRATED_EVENT, onHydrated);

    let observer: ResizeObserver | undefined;
    let disconnectTimer: number | undefined;
    if (typeof ResizeObserver !== 'undefined' && targetEl) {
      observer = new ResizeObserver((entries) => {
        if (disposed || isRefreshing) return;
        const entry = entries[entries.length - 1];
        const nextHeight = entry?.contentRect?.height ?? targetEl.getBoundingClientRect().height;
        if (Math.abs(nextHeight - lastHeight) <= 8) return;
        lastHeight = nextHeight;
        scheduleDebouncedRefresh(180);
      });
      observer.observe(targetEl);
      disconnectTimer = window.setTimeout(() => {
        observer?.disconnect();
      }, 3500);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(settleShort);
      window.clearTimeout(settleLong);
      window.clearTimeout(resizeDebounceId);
      window.clearTimeout(disconnectTimer);
      window.removeEventListener(SECTIONS_HYDRATED_EVENT, onHydrated);
      observer?.disconnect();
    };
  }, [pathname]);

  return <>{children}</>;
}
