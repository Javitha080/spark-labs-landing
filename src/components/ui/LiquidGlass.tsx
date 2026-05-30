import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import LiquidGlassProvider from "@/components/effects/LiquidGlassProvider";
import type { GlassConfig } from "@ybouane/liquidglass";

/**
 * LiquidGlass — real WebGL-backed glassmorphism via @ybouane/liquidglass.
 * - True refraction, chromatic aberration & specular highlights (not CSS blur)
 * - Graceful CSS fallback when WebGL isn't available
 * - Variants tune intensity: `subtle | default | intense`.
 *
 * IMPORTANT: Each instance creates a WebGL context. Browsers cap at ~16.
 * Don't use this inside lists/grids with many items — use plain CSS glass there.
 */
interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "default" | "intense" | "dark" | "button" | "dome";
  glow?: boolean;
  rounded?: "none" | "lg" | "xl" | "2xl" | "3xl" | "full";
}

const variantConfigs: Record<NonNullable<LiquidGlassProps["variant"]>, Partial<GlassConfig>> = {
  subtle: {
    blurAmount: 0.15,
    refraction: 0.4,
    cornerRadius: 16,
  },
  default: {
    blurAmount: 0.25,
    refraction: 0.65,
    cornerRadius: 32,
  },
  intense: {
    blurAmount: 0.4,
    refraction: 0.85,
    chromAberration: 0.08,
    specular: 0.15,
    cornerRadius: 32,
  },
  dark: {
    brightness: -0.3,
    blurAmount: 0.25,
    refraction: 0.6,
    cornerRadius: 32,
  },
  button: {
    button: true,
    blurAmount: 0.25,
    refraction: 0.5,
    cornerRadius: 24,
  },
  dome: {
    bevelMode: 1,
    cornerRadius: 50,
    zRadius: 50,
    floating: true,
    blurAmount: 0,
    refraction: 1.2,
  },
};

const roundedClasses = {
  none: "rounded-none",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-[2rem]",
  full: "rounded-full",
};

const LiquidGlass = ({
  className,
  variant = "default",
  glow = false,
  rounded = "2xl",
  children,
  ref,
  ...props
}: LiquidGlassProps & { ref?: React.Ref<HTMLDivElement> }) => {
  const config = variantConfigs[variant];

  return (
    <LiquidGlassProvider config={config} className={cn("relative", className)}>
      {/* Dedicated background canvas layer for WebGL shader rendering */}
      <div
        data-liquid-glass
        data-config={JSON.stringify(config)}
        className={cn(
          "absolute inset-0 overflow-hidden liquid-glass-fallback pointer-events-none",
          roundedClasses[rounded],
        )}
      />

      {/* Foreground content container (preserves flex-layouts and positions) */}
      <div
        ref={ref}
        className={cn(
          "relative size-full overflow-hidden z-10",
          roundedClasses[rounded],
          glow &&
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb),0.18),transparent_60%)]",
        )}
        {...props}
      >
        {/* Specular highlight (top sheen) — decorative CSS on top of WebGL glass */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
        {children}
      </div>
    </LiquidGlassProvider>
  );
};
LiquidGlass.displayName = "LiquidGlass";

export default LiquidGlass;
