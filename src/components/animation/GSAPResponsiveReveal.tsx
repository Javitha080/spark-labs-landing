import React, { useRef, ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion, isTouchLike, isLowPowerDevice, revealWatchdog } from "@/lib/motion";

// Register plugins once outside lifecycle
gsap.registerPlugin(useGSAP, ScrollTrigger);

const scramblerChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%-+=_?";

/* ================================================================== */
/*  GSAPDecryptText — Scroll-triggered progressive character solver   */
/* ================================================================== */
interface GSAPDecryptTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  triggerOnce?: boolean;
}

export const GSAPDecryptText = ({
  text,
  className = "",
  delay = 0,
  duration = 1.2,
  triggerOnce = true,
}: GSAPDecryptTextProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = containerRef.current;
    if (!el) return;

    // Reduced motion / weak hardware: show the final text, no scrambling.
    if (prefersReducedMotion() || isLowPowerDevice()) {
      el.textContent = text;
      gsap.set(el, { opacity: 1 });
      return;
    }

    const isMobile = window.innerWidth < 768 || isTouchLike();
    if (isMobile) {
      el.textContent = text;
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, delay });
      return;
    }

    const obj = { progress: 0 };
    const targetLen = text.length;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 92%", once: triggerOnce },
      delay,
    });

    tl.to(obj, {
      progress: 1,
      duration,
      ease: "power1.inOut",
      // Writing textContent straight to the DOM instead of calling setState
      // on every frame: a React re-render per animation frame per element was
      // the main source of scroll stutter on text-heavy sections.
      onUpdate: () => {
        const resolvedCount = Math.floor(obj.progress * targetLen);
        let currentStr = "";
        for (let i = 0; i < targetLen; i++) {
          if (text[i] === " ") currentStr += " ";
          else if (i < resolvedCount) currentStr += text[i];
          else currentStr += scramblerChars[Math.floor(Math.random() * scramblerChars.length)];
        }
        el.textContent = currentStr;
      },
      onComplete: () => {
        el.textContent = text;
      },
    });
  }, { scope: containerRef, dependencies: [text] });

  return (
    <span ref={containerRef} className={className}>
      {text}
    </span>
  );
};

/* ================================================================== */
/*  GSAPMagnetic — Pointer-tracking magnetic hover CTA pull            */
/* ================================================================== */
interface GSAPMagneticProps {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export const GSAPMagnetic = ({
  children,
  strength = 0.35,
  className = "",
}: GSAPMagneticProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: ref });

  const onMouseMove = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (window.innerWidth < 1024 || isTouch) return;

    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;

    gsap.to(el, { x, y, duration: 0.3, ease: "power2.out" });
  });

  const onMouseLeave = contextSafe(() => {
    const el = ref.current;
    if (!el) return;

    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  });

  return (
    <div
      ref={ref}
      className={`inline-block will-change-transform ${className}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

/* ================================================================== */
/*  GSAPButtonHaptic — Click reactive scale-bounce triggers           */
/* ================================================================== */
interface GSAPButtonHapticProps {
  children: ReactNode;
  className?: string;
}

export const GSAPButtonHaptic = ({
  children,
  className = "",
}: GSAPButtonHapticProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: ref });

  const onPointerDown = contextSafe(() => {
    const el = ref.current;
    if (!el) return;

    gsap.to(el, { scale: 0.94, duration: 0.12, ease: "power2.out" });
  });

  const onPointerUp = contextSafe(() => {
    const el = ref.current;
    if (!el) return;

    gsap.to(el, { scale: 1.0, duration: 0.4, ease: "elastic.out(1.2, 0.4)" });
  });

  const onPointerLeave = contextSafe(() => {
    const el = ref.current;
    if (!el) return;

    gsap.to(el, { scale: 1.0, duration: 0.25, ease: "power2.out" });
  });

  return (
    <div
      ref={ref}
      className={`inline-block cursor-pointer ${className}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>
  );
};

/* ================================================================== */
/*  GSAPCard3DTilt — Interactive 3D cursor-tracking card tilt         */
/* ================================================================== */
interface GSAPCard3DTiltProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}

export const GSAPCard3DTilt = ({
  children,
  className = "",
  maxTilt = 6,
}: GSAPCard3DTiltProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: ref });

  const onMouseMove = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (window.innerWidth < 1024 || isTouch) return;

    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xNorm = (x / rect.width) - 0.5;
    const yNorm = (y / rect.height) - 0.5;

    gsap.to(el, {
      rotateY: xNorm * maxTilt,
      rotateX: -yNorm * maxTilt,
      transformPerspective: 1000,
      ease: "power2.out",
      duration: 0.3,
    });
  });

  const onMouseLeave = contextSafe(() => {
    const el = ref.current;
    if (!el) return;

    gsap.to(el, {
      rotateY: 0,
      rotateX: 0,
      ease: "power2.out",
      duration: 0.5,
    });
  });

  return (
    <div
      ref={ref}
      className={`will-change-transform ${className}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
};

/* ================================================================== */
/*  GSAPScrollReveal — Premium responsive 3D scroll triggers          */
/* ================================================================== */
interface GSAPScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  scaleOffset?: number;
  rotateXOffset?: number;
  scrub?: boolean | number;
  once?: boolean;
  fastScrollEnd?: boolean | number;
  startTrigger?: string;
  endTrigger?: string;
  invalidateOnRefresh?: boolean;
}

export const GSAPScrollReveal = ({
  children,
  className = "",
  delay = 0,
  duration = 0.8,
  yOffset = 30,
  scaleOffset = 0.97,
  rotateXOffset = -12,
  scrub = false,
  once = true,
  fastScrollEnd = false,
  startTrigger = "top 90%",
  endTrigger,
  invalidateOnRefresh = true,
}: GSAPScrollRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;

    // Never leave content hidden if a trigger never fires (lazy container,
    // restored scroll position, failed measurement).
    const clearWatchdog = revealWatchdog(ref.current);

    // Reduced motion: render in place, no transform work at all.
    if (prefersReducedMotion()) {
      gsap.set(ref.current, { opacity: 1, y: 0, scale: 1, rotateX: 0, clearProps: "willChange" });
      clearWatchdog();
      return;
    }

    const isMobile = window.innerWidth < 1024 || isTouchLike() || isLowPowerDevice();

    if (isMobile) {
      gsap.fromTo(ref.current,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay,
          onComplete: () => {
            clearWatchdog();
            gsap.set(ref.current, { clearProps: "willChange" });
          },
          scrollTrigger: {
            trigger: ref.current,
            start: "top 95%",
            once: true,
            invalidateOnRefresh: true,
          },
        }
      );
      return clearWatchdog;
    }

    gsap.fromTo(ref.current,
      {
        opacity: 0,
        y: yOffset,
        scale: scaleOffset,
        rotateX: rotateXOffset,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        duration: scrub ? undefined : duration,
        delay: scrub ? undefined : delay,
        ease: scrub ? "none" : "power3.out",
        transformPerspective: 1200,
        onComplete: () => {
          clearWatchdog();
          // Releasing will-change keeps GPU memory from piling up across the
          // dozens of revealed sections on a long page.
          gsap.set(ref.current, { clearProps: "willChange" });
        },
        scrollTrigger: {
          trigger: ref.current,
          start: startTrigger,
          end: endTrigger || (scrub ? "bottom 60%" : undefined),
          scrub: scrub,
          once: scrub ? false : once,
          fastScrollEnd: fastScrollEnd,
          invalidateOnRefresh: invalidateOnRefresh,
        },
      }
    );

    return clearWatchdog;
  }, { scope: ref });

  return (
    <div ref={ref} className={`will-change-transform ${className}`} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
};
