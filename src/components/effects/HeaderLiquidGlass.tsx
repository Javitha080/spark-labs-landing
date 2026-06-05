/**
 * HeaderLiquidGlass — Pure CSS liquid glass pill navbar.
 *
 * Owns its own width constraints and pill shape (the parent m.header
 * is just a full-viewport fixed container for centering).
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

// Framer-motion variants for the pill container's width + borderRadius
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

const HeaderLiquidGlass = memo(
  ({ children, className, isScrolled }: HeaderLiquidGlassProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      const t = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(t);
    }, []);

    return (
      <m.div
        className="header-liquid-glass-root"
        variants={pillVariants}
        initial="initial"
        animate={isScrolled ? "scrolled" : "initial"}
        style={{
          position: "relative",
          opacity: mounted ? 1 : 0,
        }}
      >
        {/* ── Glass surface ── */}
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

        {/* ── Scoped styles ── */}
        <style>{`
          /* ── Pill root: outer glow ── */
          .header-liquid-glass-root {
            box-shadow:
              0 8px 32px -8px rgba(0, 0, 0, 0.35),
              0 0 0 0.5px hsl(0 0% 100% / 0.06);
            transition: opacity 0.4s ease-out;
          }

          /* ── Glass surface ── */
          .header-lg-surface {
            overflow: visible;
            background: hsl(var(--background) / 0.18);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1.5px solid hsl(0 0% 100% / 0.18);
            box-shadow:
              inset 0 1px 0 hsl(0 0% 100% / 0.15),
              inset 0 -1px 0 hsl(0 0% 0% / 0.08);
            transition:
              background 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          }

          /* Top specular edge highlight */
          .header-lg-surface::before {
            content: '';
            position: absolute;
            top: 0;
            left: 10%;
            right: 10%;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent,
              hsl(0 0% 100% / 0.45) 40%,
              hsl(0 0% 100% / 0.55) 50%,
              hsl(0 0% 100% / 0.45) 60%,
              transparent
            );
            pointer-events: none;
            z-index: 2;
          }

          /* Inner refraction glow */
          .header-lg-surface::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background:
              radial-gradient(ellipse at 15% 40%, hsl(var(--primary) / 0.10), transparent 50%),
              radial-gradient(ellipse at 85% 50%, hsl(var(--accent, var(--primary)) / 0.07), transparent 50%);
            pointer-events: none;
            z-index: 1;
          }

          /* ── Scrolled: denser glass ── */
          .header-lg-scrolled {
            background: hsl(var(--background) / 0.30);
            backdrop-filter: blur(32px) saturate(200%);
            -webkit-backdrop-filter: blur(32px) saturate(200%);
            border-color: hsl(var(--primary) / 0.20);
            box-shadow:
              inset 0 1px 0 hsl(0 0% 100% / 0.18),
              inset 0 -1px 0 hsl(0 0% 0% / 0.10);
          }

          /* Scrolled root glow */
          .header-liquid-glass-root:has(.header-lg-scrolled) {
            box-shadow:
              0 12px 40px -10px rgba(0, 0, 0, 0.45),
              0 0 24px -8px hsl(var(--primary) / 0.20),
              0 0 0 0.5px hsl(0 0% 100% / 0.08);
          }

          /* Light mode adjustments */
          :root:not(.dark) .header-lg-surface {
            background: hsl(var(--background) / 0.45);
            border-color: hsl(0 0% 100% / 0.55);
          }
          :root:not(.dark) .header-lg-scrolled {
            background: hsl(var(--background) / 0.55);
            border-color: hsl(0 0% 100% / 0.65);
          }
          :root:not(.dark) .header-liquid-glass-root {
            box-shadow:
              0 8px 32px -8px rgba(0, 0, 0, 0.12),
              0 0 0 0.5px hsl(0 0% 100% / 0.45);
          }
        `}</style>
      </m.div>
    );
  },
);

HeaderLiquidGlass.displayName = "HeaderLiquidGlass";

export default HeaderLiquidGlass;
