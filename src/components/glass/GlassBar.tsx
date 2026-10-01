import { memo } from "react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Glass for the fixed navbar pill.
 *
 * This one is deliberately CSS (backdrop-filter), not the WebGL library. The
 * navbar floats over every section of every page while Lenis scrolls them, and
 * the shader can only refract content that was rasterised into its own stage;
 * feeding it the whole page on every scroll frame would cost far more than it
 * gives. The look is defined by `.glass-bar` in index.css.
 *
 * The pill morphs between a rounded pill and a squarer bar once the page has
 * scrolled. Only width, max-width and radius animate, through framer-motion.
 */
interface GlassBarProps {
  children: React.ReactNode;
  className?: string;
  isScrolled?: boolean;
}

const pillVariants = {
  initial: {
    width: "90%",
    maxWidth: "1185px",
    borderRadius: "9999px",
    transition: { type: "spring" as const, stiffness: 120, damping: 22 },
  },
  scrolled: {
    width: "95%",
    maxWidth: "1300px",
    borderRadius: "24px",
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  },
};

const GlassBar = memo(({ children, className, isScrolled }: GlassBarProps) => (
  <m.div
    className="glass-bar-root relative"
    variants={pillVariants}
    initial="initial"
    animate={isScrolled ? "scrolled" : "initial"}
  >
    <div
      className={cn("glass-bar relative", isScrolled && "glass-bar--scrolled", className)}
      style={{ borderRadius: "inherit" }}
    >
      {children}
    </div>
  </m.div>
));

GlassBar.displayName = "GlassBar";

export default GlassBar;
