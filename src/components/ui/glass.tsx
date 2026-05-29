import * as React from "react";
import { cn } from "@/lib/utils";
import LiquidGlassProvider from "@/components/effects/LiquidGlassProvider";
import type { GlassConfig } from "@ybouane/liquidglass";

/**
 * LiquidGlass — WebGL-backed glassmorphism via @ybouane/liquidglass.
 * Maps blur/opacity props to real refraction config.
 * Falls back to CSS glassmorphism when WebGL isn't available.
 *
 * IMPORTANT: Each instance creates a WebGL context. Browsers cap at ~16.
 * Don't use this inside lists/grids with many items.
 */
interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Intensity of the blur effect */
  blur?: "sm" | "md" | "lg" | "xl";
  /** Background opacity */
  opacity?: "sm" | "md" | "lg";
  /** Add animated gradient orbs */
  animated?: boolean;
  /** Add shimmer effect on hover */
  shimmer?: boolean;
  /** Border style */
  border?: "none" | "subtle" | "glow";
}

const blurConfigs: Record<NonNullable<LiquidGlassProps["blur"]>, Partial<GlassConfig>> = {
  sm: { blurAmount: 0.1, refraction: 0.3 },
  md: { blurAmount: 0.2, refraction: 0.5 },
  lg: { blurAmount: 0.3, refraction: 0.65 },
  xl: { blurAmount: 0.45, refraction: 0.8, chromAberration: 0.05 },
};

const opacityToAlpha: Record<NonNullable<LiquidGlassProps["opacity"]>, number> = {
  sm: 0.3,
  md: 0.5,
  lg: 0.7,
};

export const LiquidGlass = ({
  className,
  blur = "lg",
  opacity = "md",
  animated = true,
  shimmer = true,
  border = "subtle",
  children,
  ref,
  ...props
}: LiquidGlassProps & { ref?: React.Ref<HTMLDivElement> }) => {
  const config: Partial<GlassConfig> = {
    ...blurConfigs[blur],
    cornerRadius: 16,
  };

  return (
    <LiquidGlassProvider config={config} className={cn("relative", className)}>
      <div
        ref={ref}
        data-liquid-glass
        data-config={JSON.stringify(config)}
        className={cn(
          "relative overflow-hidden rounded-2xl liquid-glass-fallback",
          border === "subtle" && "border border-white/10",
          border === "glow" &&
            "border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.2)]",
        )}
        style={{ "--glass-bg-alpha": opacityToAlpha[opacity] } as React.CSSProperties}
        {...props}
      >
        {/* Animated gradient orbs (decorative CSS on top of WebGL glass) */}
        {animated && (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            {/* Gradient Orbs */}
            <div className="absolute -top-24 -right-24 size-72 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute -bottom-24 -left-24 size-64 bg-gradient-to-tr from-secondary/25 via-secondary/10 to-transparent rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 size-80 bg-gradient-to-r from-accent/15 via-transparent to-accent/15 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
            {/* Inner Light */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
          </div>
        )}

        {/* Shimmer Effect */}
        {shimmer && (
          <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000 pointer-events-none -rotate-1 scale-150" />
        )}

        {children}
      </div>
    </LiquidGlassProvider>
  );
};
LiquidGlass.displayName = "LiquidGlass";

// ─────────────────────────────────────────────
// Specialized Glass Panel Component
// ─────────────────────────────────────────────

const panelVariantConfigs: Record<string, Partial<GlassConfig>> = {
  default: { blurAmount: 0.25, refraction: 0.5, cornerRadius: 16 },
  elevated: {
    blurAmount: 0.35,
    refraction: 0.7,
    chromAberration: 0.04,
    specular: 0.1,
    cornerRadius: 16,
  },
  inset: { blurAmount: 0.15, refraction: 0.35, cornerRadius: 16 },
};

const glowClasses = {
  primary:
    "shadow-[0_0_40px_hsl(var(--primary)/0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
  secondary:
    "shadow-[0_0_40px_hsl(var(--secondary)/0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
  accent:
    "shadow-[0_0_40px_hsl(var(--accent)/0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
  none: "",
};

export const GlassPanel = ({
  className,
  variant = "default",
  glow = "none",
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "elevated" | "inset";
  glow?: "primary" | "secondary" | "accent" | "none";
} & { ref?: React.Ref<HTMLDivElement> }) => {
  const config = panelVariantConfigs[variant] || panelVariantConfigs.default;

  return (
    <LiquidGlassProvider config={config} className={cn("relative", className)}>
      <div
        ref={ref}
        data-liquid-glass
        data-config={JSON.stringify(config)}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 liquid-glass-fallback",
          glowClasses[glow],
        )}
        {...props}
      >
        {/* Glass Reflection (decorative CSS on top of WebGL glass) */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(255,255,255,0.05)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {children}
      </div>
    </LiquidGlassProvider>
  );
};
GlassPanel.displayName = "GlassPanel";

export { LiquidGlass as default };
