/**
 * HeaderLiquidGlass — React wrapper for @ybouane/liquidglass
 *
 * Initialises the real LiquidGlass library on the header container so
 * the glass panel refracts the decorative gradient background behind it
 * with physically-accurate biconvex refraction, Blinn-Phong specular,
 * chromatic aberration, and Fresnel lighting — all rendered in real-time
 * via the library's multi-pass WebGL pipeline.
 *
 * Architecture:
 *   root (position: relative)
 *     ├── .glass-bg  — rich gradient orbs (captured by library as bg)
 *     └── .glass     — header bar (data-liquid-glass, gets effect)
 */
import { useEffect, useRef, useCallback, memo } from "react";
import { useTheme } from "next-themes";
import type { GlassConfig } from "@ybouane/liquidglass";

interface HeaderLiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  isScrolled?: boolean;
}

// Glass config tuned for the header bar
const BASE_CONFIG: Partial<GlassConfig> = {
  blurAmount: 0.30,
  refraction: 0.72,
  chromAberration: 0.06,
  edgeHighlight: 0.18,
  specular: 0.35,
  fresnel: 1.0,
  distortion: 0.04,
  cornerRadius: 9999,
  zRadius: 36,
  opacity: 0.92,
  saturation: 0.12,
  tintStrength: 0.14,
  brightness: 0.06,
  shadowOpacity: 0.18,
  shadowSpread: 14,
  shadowOffsetY: 3,
  bevelMode: 0,
};

const SCROLLED_OVERRIDES: Partial<GlassConfig> = {
  cornerRadius: 24,
  zRadius: 30,
  blurAmount: 0.38,
  shadowSpread: 18,
  shadowOpacity: 0.22,
  refraction: 0.68,
  specular: 0.40,
  edgeHighlight: 0.22,
  brightness: 0.08,
};

const HeaderLiquidGlass = memo(({ children, className, isScrolled }: HeaderLiquidGlassProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const { theme } = useTheme();

  // Initialise the library on mount
  useEffect(() => {
    const root = rootRef.current;
    const glass = glassRef.current;
    if (!root || !glass) return;

    let destroyed = false;

    (async () => {
      try {
        const { LiquidGlass } = await import("@ybouane/liquidglass");
        if (destroyed) return;

        const instance = await LiquidGlass.init({
          root,
          glassElements: [glass],
          defaults: BASE_CONFIG as GlassConfig,
        });

        if (destroyed) {
          instance.destroy();
          return;
        }

        instanceRef.current = instance;
      } catch (err) {
        console.warn("LiquidGlass init failed, CSS fallback active:", err);
      }
    })();

    return () => {
      destroyed = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update glass config when scroll state changes
  useEffect(() => {
    const glass = glassRef.current;
    if (!glass) return;

    const config = isScrolled ? SCROLLED_OVERRIDES : {};
    glass.dataset.config = JSON.stringify(config);
  }, [isScrolled]);

  // Re-mark when theme changes so the library re-captures backgrounds
  const markChanged = useCallback(() => {
    // Small delay to let CSS vars propagate after theme switch
    setTimeout(() => {
      instanceRef.current?.markChanged();
    }, 50);
  }, []);

  useEffect(() => {
    markChanged();
  }, [theme, markChanged]);

  return (
    <div
      ref={rootRef}
      className="relative w-full flex justify-center pointer-events-none"
    >
      {/* ── Gradient background for glass refraction ──
          These are the non-glass children of root.
          The library captures them as the "scene" that the
          glass refracts through its biconvex SDF shader. */}
      <div
        className="absolute inset-[-20px] pointer-events-none overflow-hidden"
        aria-hidden="true"
        style={{ borderRadius: "inherit" }}
      >
        {/* Primary aurora gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-secondary/35 to-accent/40 opacity-70 blur-xl" />

        {/* Color orbs — positioned to create rich dispersion patterns */}
        <div className="absolute top-[-8px] left-[12%] size-36 bg-primary/50 rounded-full blur-3xl opacity-75 animate-pulse" />
        <div className="absolute bottom-[-8px] right-[12%] size-28 bg-secondary/45 rounded-full blur-2xl opacity-65 animate-pulse [animation-delay:1.2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 bg-accent/30 rounded-full blur-3xl opacity-55 animate-pulse [animation-delay:0.6s]" />

        {/* Additional color mesh accents */}
        <div className="absolute top-[-4px] left-[35%] size-20 bg-violet-500/35 rounded-full blur-2xl opacity-60" />
        <div className="absolute bottom-[-4px] right-[30%] size-16 bg-blue-500/30 rounded-full blur-xl opacity-55" />
        <div className="absolute top-1/3 right-[20%] size-24 bg-indigo-400/25 rounded-full blur-2xl opacity-45" />

        {/* Subtle horizontal light band */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[60%] bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
      </div>

      {/* ── Glass header bar ──
          This is the glass element. The library injects a canvas as
          its first child with z-index:-1 that renders the refracted
          background through the WebGL shader pipeline. */}
      <div
        ref={glassRef}
        data-liquid-glass
        className={className}
        style={{ overflow: "visible" }}
      >
        {children}
      </div>
    </div>
  );
});

HeaderLiquidGlass.displayName = "HeaderLiquidGlass";

export default HeaderLiquidGlass;
