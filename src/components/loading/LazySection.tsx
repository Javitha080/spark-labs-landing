import React, { Suspense, lazy, type ComponentType, type ReactNode } from "react";

type LazyProps = Record<string, unknown>;

const EMPTY_PROPS: LazyProps = {};

interface LazySectionProps {
  /** The lazy-loaded component factory - e.g. () => import("@/components/Team") */
  factory: () => Promise<{ default: ComponentType<LazyProps> }>;
  /** Props to pass to the lazy component */
  componentProps?: LazyProps;
  /** Ignored (kept for compatibility) */
  rootMargin?: string;
  /** Ignored (kept for compatibility) */
  priority?: boolean;
  /** Wrapper element around the lazy component */
  children?: (Component: ComponentType<LazyProps>) => ReactNode;
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
        {/* children-as-function render prop: callers wrap the lazy component
            themselves (e.g. in FadeInOnScroll). React already treats a
            function child as opaque data, so no component type is leaked. */}
        {/* eslint-disable-next-line react-hooks/static-components -- render-prop API: the function child is opaque React data, invoked lazily after mount */}
        {children ? children(Component) : <Component {...componentProps} />}
      </Suspense>
    </div>
  );
}
