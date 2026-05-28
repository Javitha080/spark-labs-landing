import React, { Suspense, lazy, type ComponentType, type ReactNode } from "react";

const EMPTY_PROPS: Record<string, any> = {};

interface LazySectionProps {
  /** The lazy-loaded component factory — e.g. () => import("@/components/Team") */
  factory: () => Promise<{ default: ComponentType<any> }>;
  /** Props to pass to the lazy component */
  componentProps?: Record<string, any>;
  /** Ignored (kept for compatibility) */
  rootMargin?: string;
  /** Ignored (kept for compatibility) */
  priority?: boolean;
  /** Wrapper element around the lazy component */
  children?: (Component: ComponentType<any>) => ReactNode;
  /** Ignored (kept for compatibility) */
  skeletonHeight?: string;
  /** Extra className for the container */
  className?: string;
  /** Optional ID for the section container, useful for scroll anchoring */
  id?: string;
}

export default function LazySection({
  factory,
  componentProps = EMPTY_PROPS,
  children,
  className = "",
  id,
}: LazySectionProps) {
  // Memoize the lazy component so it's not recreated on every render
  const Component = React.useMemo(() => lazy(factory), [factory]);

  return (
    <div id={id} className={className}>
      <Suspense fallback={null}>
        {children ? children(Component) : <Component {...componentProps} />}
      </Suspense>
    </div>
  );
}
