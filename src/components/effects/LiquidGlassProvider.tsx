import { memo } from "react";

/**
 * LiquidGlassProvider (Legacy Wrapper)
 * Retained simply to prevent breaking existing imports across the project.
 * It is now just a dummy wrapper fragment since WebGL is removed.
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
