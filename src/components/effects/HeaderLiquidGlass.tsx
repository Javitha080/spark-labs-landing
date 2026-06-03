/**
 * HeaderLiquidGlass — React wrapper for @ybouane/liquidglass
 *
 * Uses the REAL @ybouane/liquidglass library to render physically-accurate
 * liquid glass on the header bar. The glass refracts a canvas-painted
 * gradient background using the library's multi-pass WebGL pipeline.
 *
 * Key insight from ybouane demo source: background content must be
 * <img>, <video>, or <canvas> elements — NOT CSS gradient divs —
 * because the library captures those via the fast `ctx.drawImage()` path.
 * CSS-styled divs go through html-to-image which fails to resolve
 * Tailwind classes and CSS custom properties.
 *
 * Architecture (matching ybouane demo pattern):
 *   root (position: relative)
 *     ├── <canvas>   — painted gradient bg (captured natively by library)
 *     └── <div>      — glass element (data-liquid-glass, gets effect)
 */
import { useEffect, useRef, useCallback, memo } from "react";
import { useTheme } from "next-themes";
import type { GlassConfig } from "@ybouane/liquidglass";

interface HeaderLiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  isScrolled?: boolean;
}

// ── Glass config tuned for the header bar ──
const BASE_CONFIG: Partial<GlassConfig> = {
  blurAmount: 0.25,
  refraction: 0.70,
  chromAberration: 0.06,
  edgeHighlight: 0.15,
  specular: 0.25,
  fresnel: 1.0,
  distortion: 0.03,
  cornerRadius: 9999,
  zRadius: 35,
  opacity: 0.95,
  saturation: 0.10,
  tintStrength: 0.12,
  brightness: -0.05,
  shadowOpacity: 0.20,
  shadowSpread: 12,
  shadowOffsetY: 3,
  bevelMode: 0,
};

const SCROLLED_OVERRIDES: Partial<GlassConfig> = {
  cornerRadius: 24,
  zRadius: 28,
  blurAmount: 0.32,
  shadowSpread: 16,
  shadowOpacity: 0.24,
  specular: 0.30,
  edgeHighlight: 0.20,
  brightness: -0.08,
};

// ── Canvas gradient painter ──
// Draws rich, opaque gradients onto a canvas for the library to capture
// via the fast `ctx.drawImage(liveCanvas)` path (same as ybouane demo
// uses <img> backgrounds).
function drawOrb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function paintGradientBackground(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const w = width;
  const h = height;
  const isDark = document.documentElement.classList.contains("dark");

  if (isDark) {
    // ── Dark mode: deep purple-violet aurora ──
    // Solid opaque base (the library fills scene with #070813 anyway)
    ctx.fillStyle = "#0d0118";
    ctx.fillRect(0, 0, w, h);

    // Horizontal gradient wash
    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, "rgba(88, 28, 135, 0.70)");
    hGrad.addColorStop(0.2, "rgba(139, 92, 246, 0.55)");
    hGrad.addColorStop(0.45, "rgba(79, 70, 229, 0.45)");
    hGrad.addColorStop(0.65, "rgba(168, 85, 247, 0.50)");
    hGrad.addColorStop(0.85, "rgba(139, 92, 246, 0.55)");
    hGrad.addColorStop(1, "rgba(88, 28, 135, 0.70)");
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);

    // Glowing radial orbs — rich colors for visible refraction
    drawOrb(ctx, w * 0.08, h * 0.35, w * 0.09, "rgba(168, 85, 247, 0.75)");
    drawOrb(ctx, w * 0.28, h * 0.65, w * 0.11, "rgba(99, 102, 241, 0.60)");
    drawOrb(ctx, w * 0.48, h * 0.40, w * 0.15, "rgba(139, 92, 246, 0.50)");
    drawOrb(ctx, w * 0.68, h * 0.60, w * 0.10, "rgba(147, 51, 234, 0.65)");
    drawOrb(ctx, w * 0.88, h * 0.35, w * 0.08, "rgba(79, 70, 229, 0.60)");

    // Accent hot-spots for extra dispersion
    drawOrb(ctx, w * 0.18, h * 0.5, w * 0.05, "rgba(236, 72, 153, 0.40)");
    drawOrb(ctx, w * 0.78, h * 0.45, w * 0.06, "rgba(59, 130, 246, 0.45)");

    // Top-light gradient for depth/dimension
    const tGrad = ctx.createLinearGradient(0, 0, 0, h);
    tGrad.addColorStop(0, "rgba(255, 255, 255, 0.05)");
    tGrad.addColorStop(0.4, "rgba(0, 0, 0, 0)");
    tGrad.addColorStop(1, "rgba(0, 0, 0, 0.15)");
    ctx.fillStyle = tGrad;
    ctx.fillRect(0, 0, w, h);
  } else {
    // ── Light mode: crystal blue-violet ──
    ctx.fillStyle = "#eef0ff";
    ctx.fillRect(0, 0, w, h);

    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, "rgba(199, 210, 254, 0.75)");
    hGrad.addColorStop(0.3, "rgba(224, 231, 254, 0.55)");
    hGrad.addColorStop(0.6, "rgba(186, 230, 253, 0.50)");
    hGrad.addColorStop(1, "rgba(196, 181, 253, 0.65)");
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);

    drawOrb(ctx, w * 0.12, h * 0.40, w * 0.09, "rgba(147, 197, 253, 0.55)");
    drawOrb(ctx, w * 0.45, h * 0.50, w * 0.14, "rgba(165, 180, 252, 0.45)");
    drawOrb(ctx, w * 0.82, h * 0.45, w * 0.08, "rgba(196, 181, 253, 0.55)");

    // Accent hot-spots
    drawOrb(ctx, w * 0.30, h * 0.3, w * 0.06, "rgba(129, 140, 248, 0.35)");
    drawOrb(ctx, w * 0.65, h * 0.6, w * 0.05, "rgba(167, 139, 250, 0.40)");
  }
}

// ── Component ──
const HeaderLiquidGlass = memo(
  ({ children, className, isScrolled }: HeaderLiquidGlassProps) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const glassRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const instanceRef = useRef<any>(null);
    const { resolvedTheme } = useTheme();

    // Paint the canvas background
    const paintBg = useCallback(() => {
      const canvas = bgCanvasRef.current;
      const root = rootRef.current;
      if (!canvas || !root) return;

      const rect = root.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      paintGradientBackground(canvas, rect.width, rect.height);

      // Notify the library that background canvas content changed
      if (instanceRef.current) {
        instanceRef.current.markChanged(canvas);
      }
    }, []);

    // Initialise the library on mount
    useEffect(() => {
      const root = rootRef.current;
      const glass = glassRef.current;
      if (!root || !glass) return;

      // Paint background BEFORE init so the library pre-captures it
      paintBg();

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

      // Repaint canvas + notify library on resize (handles m.header animation)
      const resizeObserver = new ResizeObserver(() => {
        paintBg();
      });
      resizeObserver.observe(root);

      return () => {
        destroyed = true;
        resizeObserver.disconnect();
        instanceRef.current?.destroy();
        instanceRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Repaint canvas when theme changes (CSS vars change the gradient colors)
    useEffect(() => {
      const timer = setTimeout(paintBg, 80);
      return () => clearTimeout(timer);
    }, [resolvedTheme, paintBg]);

    // Update glass config when scroll state changes
    useEffect(() => {
      const glass = glassRef.current;
      if (!glass) return;

      const config = isScrolled ? SCROLLED_OVERRIDES : {};
      glass.dataset.config = JSON.stringify(config);
    }, [isScrolled]);

    return (
      <div ref={rootRef} className="relative w-full">
        {/* ── Canvas background ──
            Painted programmatically with rich gradients. The library
            captures <canvas> elements directly via ctx.drawImage()
            (fast path — same as ybouane demo uses <img> backgrounds).
            This bypasses the html-to-image path that fails with
            Tailwind classes and CSS custom properties. */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
          aria-hidden="true"
        />

        {/* ── Glass element ──
            The library injects a <canvas> as first child with z-index:-1.
            No CSS border needed — the library renders edge highlights via
            its SDF shader (edgeHighlight, specular, fresnel). */}
        <div
          ref={glassRef}
          data-liquid-glass
          className={className}
          style={{ overflow: "visible", position: "relative" }}
        >
          {children}
        </div>
      </div>
    );
  },
);

HeaderLiquidGlass.displayName = "HeaderLiquidGlass";

export default HeaderLiquidGlass;
