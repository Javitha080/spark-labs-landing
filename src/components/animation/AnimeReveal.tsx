/**
 * Anime.js v4 powered animation primitives.
 * Designed to coexist with the existing framer-motion-based ScrollAnimations.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate, stagger, useAnime, prefersReducedMotion } from "@/lib/anime";

/* ------------------------------------------------------------------ */
/*  AnimeText — character/word splitter with stagger reveal           */
/* ------------------------------------------------------------------ */

interface AnimeTextProps {
  text: string;
  by?: "char" | "word";
  className?: string;
  delay?: number;
  duration?: number;
  staggerMs?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
}

export const AnimeText = ({
  text,
  by = "word",
  className = "",
  delay = 0,
  duration = 700,
  staggerMs = 40,
  as: Tag = "span",
}: AnimeTextProps) => {
  const tokens = useMemo(
    () => (by === "char" ? Array.from(text) : text.split(/(\s+)/)),
    [text, by]
  );

  const ref = useAnime<HTMLElement>(
    (el) => {
      const targets = el.querySelectorAll<HTMLElement>("[data-anime-token]");
      if (!targets.length) return null;
      return {
        target: targets,
        params: {
          opacity: [0, 1],
          translateY: [12, 0],
          duration,
          delay: stagger(staggerMs, { start: delay }),
          ease: "outQuad",
        },
      };
    },
    [text, by, delay, duration, staggerMs],
    { whenInView: true }
  );

  return (
    <Tag ref={ref as unknown as React.Ref<HTMLDivElement>} className={className} aria-label={text}>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
        return (
          <span
            key={i}
            data-anime-token
            aria-hidden="true"
            style={{ display: "inline-block", opacity: 0, willChange: "transform, opacity" }}
          >
            {tok}
          </span>
        );
      })}
    </Tag>
  );
};

/* ------------------------------------------------------------------ */
/*  AnimeCounter — smooth number tween, in-view triggered             */
/* ------------------------------------------------------------------ */

interface AnimeCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Format with K/M/B suffix when over 1000 */
  compact?: boolean;
}

export const AnimeCounter = ({
  value,
  duration = 1800,
  prefix = "",
  suffix = "",
  className = "",
  compact = false,
}: AnimeCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const obj = { n: 0 };
            instance = animate(obj, {
              n: value,
              duration,
              ease: "outExpo",
              onUpdate: () => setDisplay(Math.round(obj.n)),
            });
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      instance?.pause?.();
    };
  }, [value, duration]);

  const formatted =
    compact && display >= 1000
      ? display >= 1_000_000
        ? `${(display / 1_000_000).toFixed(1)}M`
        : `${(display / 1000).toFixed(display >= 10_000 ? 0 : 1)}K`
      : display.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  AnimeMagnetic — pointer-tracking magnetic hover                   */
/* ------------------------------------------------------------------ */

interface AnimeMagneticProps {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export const AnimeMagnetic = ({
  children,
  strength = 0.3,
  className = "",
}: AnimeMagneticProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * strength;
      const y = (e.clientY - rect.top - rect.height / 2) * strength;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        animate(el, { translateX: x, translateY: y, duration: 400, ease: "outQuad" });
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      animate(el, { translateX: 0, translateY: 0, duration: 600, ease: "outElastic(1, 0.5)" });
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [strength]);

  return (
    <div ref={ref} className={`inline-block will-change-transform ${className}`}>
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AnimeFadeUp — simple fade+rise on scroll (anime.js powered)       */
/* ------------------------------------------------------------------ */

interface AnimeFadeUpProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}

export const AnimeFadeUp = ({
  children,
  className = "",
  delay = 0,
  distance = 24,
}: AnimeFadeUpProps) => {
  const ref = useAnime<HTMLDivElement>(
    (el) => ({
      target: el,
      params: {
        opacity: [0, 1],
        translateY: [distance, 0],
        duration: 700,
        delay,
        ease: "outQuad",
      },
    }),
    [delay, distance],
    { whenInView: true }
  );

  return (
    <div ref={ref} className={className} style={{ opacity: 0, willChange: "transform, opacity" }}>
      {children}
    </div>
  );
};
