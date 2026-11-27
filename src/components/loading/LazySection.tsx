import React, { Suspense, lazy, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { BOOT_EVENT, hasBooted } from "@/lib/boot";
import { prefersReducedMotion } from "@/lib/motion";

type LazyProps = Record<string, unknown>;

const EMPTY_PROPS: LazyProps = {};

export const SECTIONS_HYDRATED_EVENT = "yicdvp:sections-hydrated";

interface LazySectionProps {
  /** The lazy-loaded component factory - e.g. () => import("@/components/Team") */
  factory: () => Promise<{ default: ComponentType<LazyProps> }>;
  /** Props to pass to the lazy component */
  componentProps?: LazyProps;
  /** Wrapper element around the lazy component */
  children?: (Component: ComponentType<LazyProps>) => ReactNode;
  /** Extra className for the container */
  className?: string;
  /** Optional ID for the section container, useful for scroll anchoring */
  id?: string;
}

/* ─── Serialized Post-Boot Idle Hydration Scheduler ────────────────────────── */
const idleQueue: Array<() => void> = [];
let pumping = false;
let bootListenerAttached = false;

function scheduleNextSlice() {
  if (idleQueue.length === 0) {
    pumping = false;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SECTIONS_HYDRATED_EVENT));
    }
    return;
  }
  pumping = true;
  const runOne = () => {
    const next = idleQueue.shift();
    next?.();
    if (idleQueue.length > 0) {
      window.setTimeout(scheduleNextSlice, 48);
    } else {
      pumping = false;
      window.dispatchEvent(new Event(SECTIONS_HYDRATED_EVENT));
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runOne, { timeout: 700 });
  } else {
    window.setTimeout(runOne, 64);
  }
}

function enqueueIdleMount(activate: () => void): () => void {
  idleQueue.push(activate);

  const startWhenReady = () => {
    if (pumping || idleQueue.length === 0) return;
    pumping = true;
    // Give Hero entrance animations a clean ~320ms frame-budget head start
    // before progressively hydrating below-the-fold sections one slice at a time.
    window.setTimeout(() => {
      pumping = false;
      scheduleNextSlice();
    }, 320);
  };

  if (hasBooted() || prefersReducedMotion() || window.location.pathname !== "/") {
    startWhenReady();
  } else if (!bootListenerAttached) {
    bootListenerAttached = true;
    window.addEventListener(
      BOOT_EVENT,
      () => {
        bootListenerAttached = false;
        startWhenReady();
      },
      { once: true },
    );
  }

  return () => {
    const idx = idleQueue.indexOf(activate);
    if (idx >= 0) idleQueue.splice(idx, 1);
  };
}

function shouldMountEagerly(): boolean {
  if (typeof window === "undefined") return true;
  if (import.meta.env.MODE === "test") return true;
  if (typeof IntersectionObserver === "undefined") return true;
  if (window.location.hash !== "") return true;
  return false;
}

/**
 * Code-splits a landing section with:
 *  1. Parallel background JS chunk preloading once boot settles (0ms network wait).
 *  2. Viewport fast-path (1200px rootMargin) so fast scrolling mounts immediately.
 *  3. Serialized 1-per-idle-slice background hydration so all 9 sections never
 *     slam the main thread simultaneously during BootScreen or Hero entrance,
 *     yet are already mounted before the reader scrolls to them.
 */
export default function LazySection({
  factory,
  componentProps = EMPTY_PROPS,
  children,
  className = "",
  id,
}: LazySectionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(shouldMountEagerly);
  const Component = React.useMemo(() => lazy(factory), [factory]);

  useEffect(() => {
    if (mounted) return undefined;

    let cancelled = false;
    const activate = () => {
      if (!cancelled) setMounted(true);
    };

    // Preload the JS chunk in the background once boot lifts so network fetch
    // completes ahead of time without executing the React subtree mid-intro.
    const preloadChunk = () => {
      if (!cancelled) void factory().catch(() => {});
    };
    let onBootPreload: (() => void) | null = null;
    let preloadTimer: number | undefined;
    if (hasBooted() || prefersReducedMotion()) {
      preloadTimer = window.setTimeout(preloadChunk, 120);
    } else {
      onBootPreload = () => {
        preloadTimer = window.setTimeout(preloadChunk, 120);
      };
      window.addEventListener(BOOT_EVENT, onBootPreload, { once: true });
    }

    // Fast-path if the visitor navigates to an in-page hash anchor after mount.
    const onHashChange = () => {
      if (window.location.hash) activate();
    };
    window.addEventListener("hashchange", onHashChange);

    // Fast-path when scrolling within 1.5 viewports of the section.
    const el = wrapperRef.current;
    const observer =
      el && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer?.disconnect();
                activate();
              }
            },
            { rootMargin: "1200px 0px" },
          )
        : null;
    if (el && observer) observer.observe(el);

    // Progressive background hydration (1 section per idle slice) so sections
    // settle into the DOM quietly before the user even starts scrolling.
    const cancelQueue = enqueueIdleMount(() => {
      observer?.disconnect();
      activate();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(preloadTimer);
      if (onBootPreload) window.removeEventListener(BOOT_EVENT, onBootPreload);
      window.removeEventListener("hashchange", onHashChange);
      observer?.disconnect();
      cancelQueue();
    };
  }, [mounted, factory]);

  return (
    <div ref={wrapperRef} id={id} className={className}>
      {mounted ? (
        <Suspense fallback={null}>
          {/* eslint-disable-next-line react-hooks/static-components -- render-prop API: the function child is opaque React data, invoked lazily after mount */}
          {children ? children(Component) : <Component {...componentProps} />}
        </Suspense>
      ) : null}
    </div>
  );
}
