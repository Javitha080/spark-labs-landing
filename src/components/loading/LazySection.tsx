import { useRef, useState, useEffect, Suspense, lazy, type ComponentType, type ReactNode } from "react";

/* ═══════════════════════════════════════════
   LAZY SECTION — Progressive loading wrapper
   Uses IntersectionObserver to only render the
   lazy child when it approaches the viewport.
   ═══════════════════════════════════════════ */

interface LazySectionProps {
  /** The lazy-loaded component factory — e.g. () => import("@/components/Team") */
  factory: () => Promise<{ default: ComponentType<any> }>;
  /** Props to pass to the lazy component */
  componentProps?: Record<string, any>;
  /** How far before viewport to trigger load (px). Default: 300 */
  rootMargin?: string;
  /** If true, load on requestIdleCallback after mount (for critical sections) */
  priority?: boolean;
  /** Wrapper element around the lazy component */
  children?: (Component: ComponentType<any>) => ReactNode;
  /** Minimum height for the skeleton placeholder */
  skeletonHeight?: string;
  /** Extra className for the container */
  className?: string;
}

/** Skeleton fallback with glassmorphism shimmer */
function SectionSkeleton({ height = "400px" }: { height?: string }) {
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ minHeight: height }}
    >
      <div className="w-full max-w-5xl mx-auto px-4 space-y-6">
        <div className="skeleton-shimmer h-8 w-48 mx-auto" />
        <div className="skeleton-shimmer h-4 w-80 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="skeleton-shimmer h-40 rounded-2xl" />
          <div className="skeleton-shimmer h-40 rounded-2xl" />
          <div className="skeleton-shimmer h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function LazySection({
  factory,
  componentProps = {},
  rootMargin = "300px",
  priority = false,
  children,
  skeletonHeight = "400px",
  className = "",
}: LazySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);

  // Priority sections: start loading on idle after mount
  useEffect(() => {
    if (!priority) return;
    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 50);

    const id = idle(() => setShouldLoad(true));
    return () => {
      if (typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(id as number);
      }
    };
  }, [priority]);

  // IntersectionObserver: trigger load when approaching viewport
  useEffect(() => {
    if (shouldLoad) return; // already triggered
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad, rootMargin]);

  // Lazy import the component when triggered
  useEffect(() => {
    if (!shouldLoad || Component) return;
    const LazyComponent = lazy(factory);
    setComponent(() => LazyComponent);
  }, [shouldLoad, factory, Component]);

  return (
    <div ref={containerRef} className={className}>
      {Component ? (
        <Suspense fallback={<SectionSkeleton height={skeletonHeight} />}>
          {children ? children(Component) : <Component {...componentProps} />}
        </Suspense>
      ) : (
        <SectionSkeleton height={skeletonHeight} />
      )}
    </div>
  );
}
