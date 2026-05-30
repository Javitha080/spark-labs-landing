import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * LiquidGlass — High-end pure CSS glassmorphism implementation.
 * - True blur and saturation filtering
 * - Specular highlights and realistic borders
 * - Subtle noise overlay for premium feel
 */
export interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "default" | "intense" | "dark" | "button" | "dome";
  glow?: boolean;
  rounded?: "none" | "lg" | "xl" | "2xl" | "3xl" | "full";
}

const roundedClasses = {
  none: "rounded-none",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-[2rem]",
  full: "rounded-full",
};

const variantClasses = {
  subtle: "bg-white/5 backdrop-blur-[12px] backdrop-saturate-[1.1] border-white/10",
  default: "bg-white/10 backdrop-blur-[24px] backdrop-saturate-[1.3] border-white/20",
  intense: "bg-white/15 backdrop-blur-[40px] backdrop-saturate-[1.5] border-white/30",
  dark: "bg-black/40 backdrop-blur-[30px] backdrop-saturate-[1.4] border-white/10 text-white",
  button: "bg-white/10 backdrop-blur-[20px] backdrop-saturate-[1.2] border-white/20 hover:bg-white/20 transition-colors",
  dome: "bg-white/10 backdrop-blur-[30px] backdrop-saturate-[1.4] border-white/20 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)]",
};

const LiquidGlass = ({
  className,
  variant = "default",
  glow = false,
  rounded = "2xl",
  children,
  ...props
}: LiquidGlassProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden border shadow-xl",
        variantClasses[variant],
        roundedClasses[rounded],
        className
      )}
      {...props}
    >
      {/* Subtle Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Top Specular Highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mix-blend-overlay"
      />

      {/* Glow Effect */}
      {glow && (
        <div 
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb),0.18),transparent_60%)]"
        />
      )}

      {/* Content */}
      <div className="relative z-10 size-full">
        {children}
      </div>
    </div>
  );
};

LiquidGlass.displayName = "LiquidGlass";

export default LiquidGlass;
