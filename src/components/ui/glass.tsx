import * as React from "react";
import { cn } from "@/lib/utils";

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

const blurClasses = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-xl",
  xl: "backdrop-blur-2xl",
};

const opacityClasses = {
  sm: "bg-background/30",
  md: "bg-background/50",
  lg: "bg-background/70",
};

export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  (
    {
      className,
      blur = "lg",
      opacity = "md",
      animated = true,
      shimmer = true,
      border = "subtle",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl",
          blurClasses[blur],
          opacityClasses[opacity],
          border === "subtle" && "border border-white/10",
          border === "glow" && "border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.2)]",
          className
        )}
        {...props}
      >
        {/* Liquid Glass Effects */}
        {animated && (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            {/* Gradient Orbs */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-secondary/25 via-secondary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-r from-accent/15 via-transparent to-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
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
    );
  }
);
LiquidGlass.displayName = "LiquidGlass";

// Specialized Glass Panel Component
export const GlassPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "elevated" | "inset";
    glow?: "primary" | "secondary" | "accent" | "none";
  }
>(({ className, variant = "default", glow = "none", children, ...props }, ref) => {
  const variantClasses = {
    default: "bg-background/50 backdrop-blur-xl",
    elevated: "bg-gradient-to-br from-background/70 via-background/50 to-background/70 backdrop-blur-2xl shadow-2xl",
    inset: "bg-background/30 backdrop-blur-md inset-shadow-lg",
  };

  const glowClasses = {
    primary: "shadow-[0_0_40px_hsl(var(--primary)/0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
    secondary: "shadow-[0_0_40px_hsl(var(--secondary)/0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
    accent: "shadow-[0_0_40px_hsl(var(--accent)/0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
    none: "",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10",
        variantClasses[variant],
        glowClasses[glow],
        className
      )}
      {...props}
    >
      {/* Glass Reflection */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(255,255,255,0.05)_100%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
});
GlassPanel.displayName = "GlassPanel";

export { LiquidGlass as default };
