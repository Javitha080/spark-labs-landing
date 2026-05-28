import { useEffect, useRef, useCallback, memo } from "react";
import type { GlassConfig } from "@ybouane/liquidglass";

/* ===========================================
   LIQUID GLASS PROVIDER
   React wrapper around @ybouane/liquidglass WebGL.
   Handles init/destroy lifecycle, respects
   prefers-reduced-motion, and provides graceful
   CSS fallback for unsupported browsers.

   CRITICAL: Glass elements must be DIRECT CHILDREN
   of the LiquidGlassProvider root div. The WebGL
   library enforces this — nested glass elements
   are silently skipped.

   Usage:
   <LiquidGlassProvider
     config={{ blurAmount: 0.3, brightness: -0.1 }}
     fallbackClassName="liquid-glass-fallback"
   >
     <div data-liquid-glass>glass element 1</div>
     <div data-liquid-glass>glass element 2</div>
   </LiquidGlassProvider>

   Per-element config overrides via data-config attr:
   <div data-liquid-glass data-config='{"button":true}'>
   =========================================== */

interface LiquidGlassProviderProps {
  children: React.ReactNode;
  /** Default glass config (applied to all glass elements) */
  config?: Partial<GlassConfig>;
  /** CSS class to apply as fallback when WebGL isn't available */
  fallbackClassName?: string;
  /** Additional class for the root wrapper */
  className?: string;
  /** Whether to enable the effect. Default true */
  enabled?: boolean;
}

const LiquidGlassProvider = memo(({
  children,
  config = {},
  fallbackClassName = "liquid-glass-fallback",
  className = "",
  enabled = true,
}: LiquidGlassProviderProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const configString = JSON.stringify(config);

  const initGlass = useCallback(async () => {
    const root = rootRef.current;
    if (!root || !enabled || prefersReducedMotion) return;

    try {
      const { LiquidGlass } = await import("@ybouane/liquidglass");

      // Re-check ref after async import — component may have unmounted
      if (rootRef.current !== root) return;

      const glassElements = root.querySelectorAll<HTMLElement>(
        "[data-liquid-glass]"
      );

      if (glassElements.length === 0) return;

      const parsedConfig = JSON.parse(configString);
      instanceRef.current = await LiquidGlass.init({
        root,
        glassElements,
        defaults: parsedConfig,
      });
    } catch (err) {
      // WebGL not supported or module load failed — apply CSS fallback
      console.warn("LiquidGlass: Falling back to CSS glassmorphism", err);
      if (rootRef.current) {
        const glassElements = rootRef.current.querySelectorAll(
          "[data-liquid-glass]"
        );
        glassElements.forEach((el) => {
          (el as HTMLElement).classList.add(fallbackClassName);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, prefersReducedMotion, configString, fallbackClassName]);

  useEffect(() => {
    initGlass();

    return () => {
      // Cleanup WebGL context on unmount
      if (instanceRef.current) {
        try {
          if (typeof instanceRef.current.destroy === "function") {
            instanceRef.current.destroy();
          }
        } catch {
          // Silently fail on cleanup
        }
        instanceRef.current = null;
      }
    };
  }, [initGlass]);

  // If reduced motion or disabled, just render children without the glass wrapper
  if (prefersReducedMotion || !enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={rootRef} className={className} style={{ position: "relative" }}>
      {children}
    </div>
  );
});

LiquidGlassProvider.displayName = "LiquidGlassProvider";

export default LiquidGlassProvider;
