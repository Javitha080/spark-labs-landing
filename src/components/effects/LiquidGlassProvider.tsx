import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { GlassConfig, LiquidGlass as LiquidGlassInstance } from "@ybouane/liquidglass";
import { cn } from "@/lib/utils";
import { supportsWebGLGlass } from "@/lib/webglSupport";

/**
 * LiquidGlassProvider - the real @ybouane/liquidglass wrapper.
 *
 * Owns one WebGL stage: the wrapper div is the library root and every
 * DIRECT child carrying `data-liquid-glass` (the old call-site contract -
 * Hero, Footer, CustomVideoPlayer) becomes a glass pane.
 *
 * The wrapper is always rendered so layout is identical whether or not the
 * shader is live. Look rules:
 *   - while the stage is live (`data-glass-stage="webgl"`, set here) the
 *     panes' own CSS glass (backgrounds/blur from Tailwind classes) is
 *     neutralised in index.css so the shader is the only glass;
 *   - if init fails, `fallbackClassName` ("glass-fallback") is added to each
 *     pane so the CSS look still lands.
 *
 * Lifecycle: each init() opens a WebGL context (browser cap ~16), so the
 * instance only exists while the stage is near the viewport
 * (IntersectionObserver rootMargin) and is destroyed after it has been
 * idle for 1.5s. Webfonts are awaited before init (capped at 8s so a hung
 * font request cannot block the stage) - captured text would otherwise
 * rasterise with fallback fonts inside the refraction.
 */
interface LiquidGlassProviderProps {
  children: React.ReactNode;
  /** Instance-wide shader defaults; panes can override via data-config. */
  config?: Partial<GlassConfig>;
  /** Class added to panes when the shader is unavailable. */
  fallbackClassName?: string;
  className?: string;
  /** Set false to force the CSS look (e.g. tiny viewports). */
  enabled?: boolean;
}

const LiquidGlassProvider = memo(({
  children,
  config = {},
  fallbackClassName = "glass-fallback",
  className = "",
  enabled = true,
}: LiquidGlassProviderProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<LiquidGlassInstance | null>(null);
  const [shaderActive, setShaderActive] = useState(false);
  const configKey = JSON.stringify(config);

  const applyFallback = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.glassStage = "css";
    Array.from(root.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute("data-liquid-glass"))
      .forEach((el) => el.classList.add(fallbackClassName));
  }, [fallbackClassName]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!supportsWebGLGlass()) return;

    let disposed = false;
    let visible = false;
    let booting = false;
    let idleTimer: number | undefined;

    const teardown = () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
      setShaderActive(false);
    };

    const boot = async () => {
      const rootNow = rootRef.current;
      if (!rootNow || instanceRef.current || booting || disposed || !visible) return;
      booting = true;
      try {
        // Race webfonts with a fallback timeout so a hung font request cannot
        // wedge the stage in "css" forever - refactoring with fallback fonts
        // is visually preferable to a permanently un-booted pane.
        await Promise.race([
          document.fonts?.ready,
          new Promise((resolve) => window.setTimeout(resolve, 8000)),
        ]);
        if (disposed || !visible) return;

        const { LiquidGlass } = await import("@ybouane/liquidglass");
        // Re-check after the async import - the node may have moved or unmounted.
        if (disposed || !visible || rootRef.current !== rootNow) return;

        const glassElements = Array.from(rootNow.children).filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute("data-liquid-glass"),
        );
        if (glassElements.length === 0) return;

        const instance = await LiquidGlass.init({
          root: rootNow,
          glassElements,
          defaults: JSON.parse(configKey) as Partial<GlassConfig>,
        });
        if (disposed || !visible) {
          instance.destroy();
          return;
        }
        // Success: drop any fallback class a failed earlier attempt applied
        // (e.g. after a retry following the idle teardown).
        glassElements.forEach((el) => el.classList.remove(fallbackClassName));
        instanceRef.current = instance;
        setShaderActive(true);
      } catch (error) {
        console.warn("[LiquidGlassProvider] shader unavailable, using CSS glass", error);
        applyFallback();
      } finally {
        booting = false;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        // Take the latest batch entry - with two batched callbacks only the
        // most recent intersection state matters.
        const entry = entries[entries.length - 1];
        visible = entry.isIntersecting;
        window.clearTimeout(idleTimer);
        if (visible) void boot();
        else {
          idleTimer = window.setTimeout(() => {
            teardown();
            // Panes keep their own CSS glass classes while the shader is down.
          }, 1500);
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(root);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(idleTimer);
      teardown();
    };
  }, [enabled, configKey, applyFallback, fallbackClassName]);

  return (
    <div
      ref={rootRef}
      data-glass-stage={shaderActive ? "webgl" : "css"}
      className={cn("relative", className)}
      style={{ position: "relative" }}
    >
      {children}
    </div>
  );
});

LiquidGlassProvider.displayName = "LiquidGlassProvider";

export default LiquidGlassProvider;
