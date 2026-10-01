import { memo } from "react";

/**
 * LiquidGlassProvider (Legacy Wrapper)
 * WebGL backend removed — this is now a plain passthrough div that preserves
 * layout/className for existing callers (Footer, home/Hero). Keep the file so
 * those imports don't break; do NOT reintroduce WebGL here.
 */
interface LiquidGlassProviderProps {
  children: React.ReactNode;
  config?: any;
  fallbackClassName?: string;
  className?: string;
  enabled?: boolean;
}

const LiquidGlassProvider = memo(({ children, className }: LiquidGlassProviderProps) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
});

LiquidGlassProvider.displayName = "LiquidGlassProvider";

export default LiquidGlassProvider;
