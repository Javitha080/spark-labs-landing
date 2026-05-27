import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import clubLogo from "@/assets/club-logo.png";
import "./AppLoaderStyles.css";

gsap.registerPlugin(ScrollTrigger);

interface AppLoaderProps {
  children: React.ReactNode;
}

const SESSION_KEY = "yicdvp_loader_gsap_v3";

/* ============================================
   SVG Text Outline Fill — "yicdvp"
   Uses stroke-dasharray/dashoffset to reveal
   the text fill from left to right, synced
   with real page load progress.
   ============================================ */
const TextOutlineFill = memo(({ progress }: { progress: number }) => {
  const textRef = useRef<SVGTextElement>(null);
  const fillRef = useRef<SVGTextElement>(null);
  const [dashLength, setDashLength] = useState(0);

  useEffect(() => {
    if (textRef.current) {
      const length = textRef.current.getComputedTextLength();
      setDashLength(length);
    }
  }, []);

  // Animate stroke dash and fill opacity based on progress
  const dashOffset = dashLength * (1 - progress);
  const fillOpacity = progress >= 1 ? 1 : 0;

  return (
    <svg
      className="app-loader__text-svg"
      viewBox="0 0 380 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="YICDVP"
    >
      <defs>
        <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(263, 70%, 58%)" />
          <stop offset="50%" stopColor="hsl(280, 72%, 58%)" />
          <stop offset="100%" stopColor="hsl(263, 70%, 58%)" />
        </linearGradient>
        {/* Clip mask that reveals left-to-right based on progress */}
        <clipPath id="fill-clip">
          <rect x="0" y="0" width={380 * progress} height="80" />
        </clipPath>
      </defs>

      {/* Outline stroke — progressively drawn */}
      <text
        ref={textRef}
        x="190"
        y="62"
        textAnchor="middle"
        className="app-loader__text-outline"
        style={{
          strokeDasharray: dashLength,
          strokeDashoffset: dashOffset,
          transition: "stroke-dashoffset 0.3s ease-out",
        }}
      >
        yicdvp
      </text>

      {/* Filled text — clipped by progress, fades in when complete */}
      <text
        ref={fillRef}
        x="190"
        y="62"
        textAnchor="middle"
        className="app-loader__text-fill"
        clipPath="url(#fill-clip)"
        style={{
          opacity: fillOpacity,
          transition: "opacity 0.6s ease-out",
        }}
      >
        yicdvp
      </text>
    </svg>
  );
});
TextOutlineFill.displayName = "TextOutlineFill";

/* ============================================
   LoaderUI — Complete AppLoader visual
   Logo + text outline fill + scroll-to-enter
   ============================================ */
const LoaderUI = memo(({ onComplete }: { onComplete: () => void }) => {
  const loaderRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);

  // Track real page load progress using Performance API
  useEffect(() => {
    let raf: number;
    let startTime = performance.now();
    const targetDuration = 3000; // Smooth 3s progress animation

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const naturalProgress = Math.min(elapsed / targetDuration, 0.95);

      // Check if the page is fully loaded
      if (document.readyState === "complete") {
        const finalProgress = Math.min(naturalProgress + 0.05, 1);
        setProgress(finalProgress);
        if (finalProgress >= 1) {
          setIsLoaded(true);
          return;
        }
      } else {
        setProgress(naturalProgress);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // Also listen for load event as backup
    const handleLoad = () => {
      setProgress(1);
      setTimeout(() => setIsLoaded(true), 300);
    };

    if (document.readyState === "complete") {
      // Already loaded — fast track
      setTimeout(() => {
        setProgress(1);
        setTimeout(() => setIsLoaded(true), 500);
      }, 1500);
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  // Show scroll CTA once loaded
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => setScrollReady(true), 400);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // GSAP scroll-triggered 3D zoom exit
  useEffect(() => {
    if (!scrollReady || !loaderRef.current) return;

    // Set up the 3D zoom exit on scroll/wheel
    const handleScroll = (e: WheelEvent | TouchEvent) => {
      e.preventDefault();

      const loader = loaderRef.current;
      if (!loader) return;

      // Animate the loader zooming toward camera and fading out
      gsap.to(loader, {
        scale: 2.5,
        opacity: 0,
        duration: 1,
        ease: "power3.in",
        onComplete: () => {
          onComplete();
        },
      });

      // Remove listeners immediately to prevent re-triggers
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
    };

    // Touch support
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      window.addEventListener("touchmove", handleTouchMove, { passive: false, once: true });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchEndY = e.touches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      if (deltaY > 30) {
        // Scrolled down
        handleScroll(e);
      }
    };

    // Also allow click to dismiss
    const handleClick = () => {
      const loader = loaderRef.current;
      if (!loader) return;
      gsap.to(loader, {
        scale: 2.5,
        opacity: 0,
        duration: 1,
        ease: "power3.in",
        onComplete: () => onComplete(),
      });
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("click", handleClick);
    };

    window.addEventListener("wheel", handleScroll, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("click", handleClick, { once: true });

    return () => {
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("click", handleClick);
    };
  }, [scrollReady, onComplete]);

  return (
    <div
      ref={loaderRef}
      className="app-loader loader-zoom-exit"
      style={{ transformOrigin: "center center" }}
    >
      {/* Center content: Logo + Text */}
      <div ref={contentRef} className="flex flex-col items-center justify-center relative">
        {/* Glow behind logo */}
        <div className={`app-loader__glow ${isLoaded ? "app-loader__glow--active" : ""}`} />

        {/* Club Logo — fades in */}
        <m.div
          className="app-loader__logo"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={clubLogo} alt="Young Innovators Club" />
        </m.div>

        {/* "yicdvp" SVG text outline fill */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
        >
          <TextOutlineFill progress={progress} />
        </m.div>
      </div>

      {/* Scroll CTA — appears after load complete */}
      <div className={`app-loader__scroll-cta ${scrollReady ? "app-loader__scroll-cta--visible" : ""}`}>
        <span className="app-loader__scroll-label">Scroll to explore</span>
        <div className="app-loader__scroll-mouse" />
        <div className="app-loader__scroll-chevron" />
      </div>
    </div>
  );
});

LoaderUI.displayName = "LoaderUI";

const AppLoader = memo(({ children }: AppLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenLoader, setHasSeenLoader] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  const isBot = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    return /googlebot|google-inspectiontool|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator|whatsapp/.test(ua);
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setIsMounted(true);
      try {
        if (sessionStorage.getItem(SESSION_KEY) === "true" || isBot) {
          setHasSeenLoader(true);
          setIsLoading(false);
          setShowContent(true);
        }
      } catch {
        // Silent
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [isBot]);

  const handleComplete = useCallback(() => {
    setIsLoading(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      // Silent
    }
    // Small delay to allow zoom-out to finish before showing content
    setTimeout(() => {
      setShowContent(true);
    }, 100);
  }, []);

  if (hasSeenLoader || prefersReducedMotion) {
    return <>{children}</>;
  }

  if (!isMounted) {
    return (
      <div
        className="fixed inset-0 z-[200]"
        style={{ background: "#050505" }}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <m.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LoaderUI onComplete={handleComplete} />
          </m.div>
        )}
      </AnimatePresence>

      <div 
        style={showContent ? undefined : { 
          position: "fixed", 
          left: "-9999px", 
          width: "1px", 
          height: "1px", 
          visibility: "hidden" as const, 
          pointerEvents: "none" as const 
        }} 
        aria-hidden={!showContent}
      >
        <AnimatePresence>
          {showContent ? (
            <m.div
              id="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </m.div>
          ) : (
            children
          )}
        </AnimatePresence>
      </div>
    </>
  );
});

AppLoader.displayName = "AppLoader";

export default AppLoader;
