import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * LiquidGlass — refined, performance-conscious glassmorphism container.
 * - GPU-friendly: only blur + transform, no animated filters.
 * - Layered specular highlight + inner glow + subtle gradient sheen.
 * - Variants tune intensity: `subtle | default | intense`.
 */
interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "default" | "intense";
  glow?: boolean;
  rounded?: "lg" | "xl" | "2xl" | "3xl" | "full";
}

const variantClasses = {
  subtle:
    "bg-background/40 backdrop-blur-xl border border-border/40 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)]",
  default:
    "bg-background/30 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]",
  intense:
    "bg-background/20 backdrop-blur-[32px] border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.2)]",
};

const roundedClasses = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-[2rem]",
  full: "rounded-full",
};

const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(
  ({ className, variant = "default", glow = false, rounded = "2xl", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden",
        variantClasses[variant],
        roundedClasses[rounded],
        glow && "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb),0.18),transparent_60%)]",
        className
      )}
      {...props}
    >
      {/* Specular highlight (top sheen) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      {children}
    </div>
  )
);
LiquidGlass.displayName = "LiquidGlass";

export default LiquidGlass;
