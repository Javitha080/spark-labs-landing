import { useEffect, useRef, useCallback, memo } from "react";
import type { GlassConfig } from "@ybouane/liquidglass";

/* ===========================================
   VIDEO LIQUID GLASS PROVIDER
   React wrapper around @ybouane/liquidglass WebGL.
   Custom-made specifically for CustomVideoPlayer components.
   =========================================== */

interface VideoLiquidGlassProviderProps {
  children: React.ReactNode;
  config?: Partial<GlassConfig>;
  fallbackClassName?: string;
  className?: string;
  enabled?: boolean;
}

const VideoLiquidGlassProvider = memo(({
  children,
  config = {},
  fallbackClassName = "liquid-glass-fallback",
  className = "",
  enabled = true,
}: VideoLiquidGlassProviderProps) => {
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

      const glassElements = Array.from(root.children).filter((el) =>
        el.hasAttribute("data-liquid-glass")
      ) as HTMLElement[];

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
        const glassElements = Array.from(rootRef.current.children).filter((el) =>
          el.hasAttribute("data-liquid-glass")
        );
        glassElements.forEach((el) => {
          (el as HTMLElement).classList.add(fallbackClassName);
        });
      }
    }
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

  if (prefersReducedMotion || !enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={rootRef} className={className} style={{ position: "relative" }}>
      {children}
    </div>
  );
});

VideoLiquidGlassProvider.displayName = "VideoLiquidGlassProvider";

export default VideoLiquidGlassProvider;
