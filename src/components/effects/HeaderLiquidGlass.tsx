/**
 * HeaderLiquidGlass - CSS glass pill navbar.
 *
 * Honest compositor-safe CSS surface: the fixed navbar floats over every
 * section of every page, and the WebGL liquid glass library can only refract
 * content rasterised into its own stage - feeding it the whole page on every
 * scroll frame would cost far more than it gives. The glass systems live in
 * @/components/liquid-glass; this pill is a sibling, same material language.
 *
 * Features:
 *   - Self-sizing pill: 90%/1185px → 95%/1300px on scroll
 *   - Animated pill border-radius: 9999px → 24px on scroll
 *   - Clean translucent backdrop-filter glass (no backlight orbs)
 *   - Specular highlights and inner refraction glow
 *
 * All animations use only transform + opacity (compositor-safe per AGENTS.md).
 */
import { memo, useState, useEffect } from "react";
import { m } from "framer-motion";

interface HeaderLiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  isScrolled?: boolean;
}

// Framer-motion variants for the pill container - transform scale only (no width animation)
const pillVariants = {
  initial: {
    scale: 0.96,
    borderRadius: "9999px",
    transition: { type: "spring" as const, stiffness: 120, damping: 22 },
  },
  scrolled: {
    scale: 1,
    borderRadius: "24px",
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  },
};

// Track initial header reveal across SPA route navigations so switching pages
// never flashes the fixed navbar back to opacity 0 for 50ms.
let hasHeaderMountedOnce = false;

const HeaderLiquidGlass = memo(
  ({ children, className, isScrolled }: HeaderLiquidGlassProps) => {
    const [mounted, setMounted] = useState(hasHeaderMountedOnce);

    useEffect(() => {
      if (hasHeaderMountedOnce) return undefined;
      const t = setTimeout(() => {
        hasHeaderMountedOnce = true;
        setMounted(true);
      }, 50);
      return () => clearTimeout(t);
    }, []);

    return (
      <m.div
        className="header-glass-pill-root"
        variants={pillVariants}
        initial="initial"
        animate={isScrolled ? "scrolled" : "initial"}
        style={{
          position: "relative",
          opacity: mounted ? 1 : 0,
          width: "95%",
          maxWidth: "1300px",
        }}
      >
        {/* ── Glass surface (styles hoisted to src/index.css) ── */}
        <div
          className={`header-lg-surface ${isScrolled ? "header-lg-scrolled" : ""} ${className || ""}`}
          style={{
            position: "relative",
            zIndex: 1,
            borderRadius: "inherit",
          }}
        >
          {children}
        </div>
      </m.div>
    );
  },
);

HeaderLiquidGlass.displayName = "HeaderLiquidGlass";

export default HeaderLiquidGlass;
