import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { isTouchLike } from "@/lib/motion";

/**
 * CSS-only glass for surfaces that cannot be a WebGL pane: draggable windows,
 * menu bars and flip cards that carry their own interactive DOM.
 *
 * It shares its tokens with `.glass-pane` (the no-WebGL look of the real
 * liquid glass) so both read as one material. Use sparingly; per the project's
 * design rules, glass is an accent on one or two surfaces per view.
 *
 * Touch devices rasterize every backdrop-filter surface on each scroll
 * frame, so the variants switch to shallower blur tiers there — same tint,
 * border and saturation recipe, proportionally less GPU work.
 */
export interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "default" | "intense" | "dark" | "button" | "dome";
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
  subtle: "bg-white/5 backdrop-saturate-[1.1] border-white/10",
  default: "bg-white/10 backdrop-saturate-[1.3] border-white/20",
  intense: "bg-white/15 backdrop-saturate-[1.5] border-white/30",
  dark: "bg-black/40 backdrop-saturate-[1.4] border-white/10 text-white",
  button: "bg-white/10 backdrop-saturate-[1.2] border-white/20 hover:bg-white/20 transition-colors",
  dome: "bg-white/10 backdrop-saturate-[1.4] border-white/20 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)]",
};

/* Blur lives in its own map so the device picks exactly one radius - two
   competing backdrop-blur-* utilities in one class list would resolve by
   stylesheet order, and that is not a contract. */
const desktopBlurClasses = {
  subtle: "backdrop-blur-[12px]",
  default: "backdrop-blur-[24px]",
  intense: "backdrop-blur-[40px]",
  dark: "backdrop-blur-[30px]",
  button: "backdrop-blur-[20px]",
  dome: "backdrop-blur-[30px]",
};

const touchBlurClasses = {
  subtle: "backdrop-blur-[6px]",
  default: "backdrop-blur-[10px]",
  intense: "backdrop-blur-[14px]",
  dark: "backdrop-blur-[12px]",
  button: "backdrop-blur-[8px]",
  dome: "backdrop-blur-[12px]",
};

export default function GlassSurface({
  className,
  variant = "default",
  rounded = "2xl",
  children,
  ...props
}: GlassSurfaceProps) {
  // Read once per render; boolean probes, no observers. Pages that mix
  // surfaces re-check cheaply, and touch state doesn't change mid-session.
  const touch = isTouchLike();

  return (
    <div
      className={cn(
        "relative overflow-hidden border",
        variantClasses[variant],
        touch ? touchBlurClasses[variant] : desktopBlurClasses[variant],
        roundedClasses[rounded],
        className,
      )}
      {...props}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="relative z-10 size-full">{children}</div>
    </div>
  );
}
