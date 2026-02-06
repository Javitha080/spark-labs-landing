import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CinematicLoader from "./CinematicLoader";

interface AppLoaderProps {
  children: React.ReactNode;
}

// CINEMATIC EXPERIENCE: Display for a full 6 seconds for the enhanced animation
const MINIMUM_DISPLAY_TIME = 6000; // 6 seconds for immersive cinematic experience
const SESSION_KEY = "yicdvp_loader_shown_v5";

type LoadingPhase = "loading" | "transitioning" | "complete";

/**
 * Premium AppLoader Component
 * 
 * Creates an immersive cinematic loading experience while the website
 * loads in parallel in a hidden container.
 * 
 * Features:
 * - 5-second minimum display for full animation appreciation
 * - Parallel background loading of website content
 * - Smooth progress animation with realistic phases
 * - Content preloading for instant reveal
 */
const AppLoader = memo(({ children }: AppLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasSeenLoader, setHasSeenLoader] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [phase, setPhase] = useState<LoadingPhase>("loading");
  const [showContent, setShowContent] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Use refs for mutable state to avoid re-renders
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  // Check reduced motion preference safely
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  // Safe sessionStorage operations
  const getSessionValue = useCallback((key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const setSessionValue = useCallback((key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Silent fail
    }
  }, []);

  // Check if user has seen loader this session
  useEffect(() => {
    setIsMounted(true);

    const seen = getSessionValue(SESSION_KEY);
    if (seen === "true") {
      setHasSeenLoader(true);
      setIsLoading(false);
      setProgress(100);
      setPhase("complete");
      setShowContent(true);
    }
  }, [getSessionValue]);

  // Cinematic easing - starts slow, smooth middle, dramatic finish
  const cinematicEasing = useCallback((t: number): number => {
    // Custom bezier-like curve for cinematic feel
    if (t < 0.3) {
      // Slow start (0-30%): Building anticipation
      return t * 0.8;
    } else if (t < 0.7) {
      // Smooth middle (30-70%): Steady progress
      return 0.24 + (t - 0.3) * 1.4;
    } else if (t < 0.9) {
      // Slow down (70-90%): Building tension
      return 0.8 + (t - 0.7) * 0.8;
    } else {
      // Final push (90-100%): Dramatic completion
      return 0.96 + (t - 0.9) * 0.4;
    }
  }, []);

  // Track loading progress with dramatic animation
  useEffect(() => {
    if (!isMounted || hasSeenLoader || prefersReducedMotion) {
      return;
    }

    startTimeRef.current = Date.now();
    let documentReady = document.readyState === "complete";
    let fontsLoaded = false;
    let imagesPreloaded = false;

    // Check fonts loaded
    const checkFonts = async () => {
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 2000)),
        ]);
        fontsLoaded = true;
      } catch {
        fontsLoaded = true;
      }
    };

    // Preload key images
    const preloadImages = () => {
      const images = document.querySelectorAll('img[src]');
      let loaded = 0;
      const total = Math.min(images.length, 5); // Preload first 5 images

      if (total === 0) {
        imagesPreloaded = true;
        return;
      }

      images.forEach((img, index) => {
        if (index >= 5) return;
        const image = img as HTMLImageElement;
        if (image.complete) {
          loaded++;
          if (loaded >= total) imagesPreloaded = true;
        } else {
          image.onload = () => {
            loaded++;
            if (loaded >= total) imagesPreloaded = true;
          };
          image.onerror = () => {
            loaded++;
            if (loaded >= total) imagesPreloaded = true;
          };
        }
      });

      // Fallback timeout
      setTimeout(() => {
        imagesPreloaded = true;
      }, 3000);
    };

    // Dramatic progress animation
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const rawProgress = Math.min(elapsed / MINIMUM_DISPLAY_TIME, 1);

      // Apply cinematic easing
      let easedProgress = cinematicEasing(rawProgress) * 100;

      // Add small variations for realism
      const microPulse = Math.sin(elapsed / 300) * 0.3;
      easedProgress = Math.max(0, Math.min(100, easedProgress + microPulse));

      setProgress(easedProgress);

      // Update phase for visual feedback
      if (easedProgress >= 90) {
        setPhase("transitioning");
      }

      // Complete when time is up AND resources are ready (or timeout)
      const allResourcesLoaded = documentReady && fontsLoaded;
      const forceComplete = elapsed >= MINIMUM_DISPLAY_TIME + 2000; // 2s grace period

      if ((elapsed >= MINIMUM_DISPLAY_TIME && allResourcesLoaded) || forceComplete) {
        setProgress(100);
        setPhase("transitioning");

        // Hold at 100% briefly for dramatic effect
        setTimeout(() => {
          setContentReady(true);
          setSessionValue(SESSION_KEY, "true");
        }, 600);
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    // Initialize parallel loading
    checkFonts();
    preloadImages();

    // Listen for document ready
    const handleLoad = () => {
      documentReady = true;
    };

    if (document.readyState !== "complete") {
      window.addEventListener("load", handleLoad, { passive: true });
    }

    // Start the cinematic progress
    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("load", handleLoad);
    };
  }, [isMounted, hasSeenLoader, prefersReducedMotion, cinematicEasing, setSessionValue]);

  // Handle loader completion with smooth reveal
  const handleComplete = useCallback(() => {
    setIsLoading(false);
    setPhase("complete");

    // Slight delay for exit animation to play
    setTimeout(() => {
      setShowContent(true);
    }, 100);
  }, []);

  // Content reveal transition
  const contentTransition = useMemo(() => ({
    duration: prefersReducedMotion ? 0.3 : 0.8,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  }), [prefersReducedMotion]);

  // Skip loader if already seen
  if (hasSeenLoader || prefersReducedMotion) {
    return <>{children}</>;
  }

  // Initial loading state
  if (!isMounted) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading application...</span>
      </div>
    );
  }

  return (
    <>
      {/* Cinematic Loader */}
      <CinematicLoader
        progress={progress}
        isVisible={isLoading && !contentReady}
        onComplete={handleComplete}
      />

      {/* Content reveal with smooth transition */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            id="main"
            initial={{
              opacity: 0,
              filter: "blur(10px) brightness(1.2)",
            }}
            animate={{
              opacity: 1,
              filter: "blur(0px) brightness(1)",
            }}
            transition={{
              duration: contentTransition.duration,
              ease: contentTransition.ease,
              filter: { duration: contentTransition.duration * 1.2 },
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PARALLEL LOADING: Hidden preload container - website loads here while animation plays */}
      {!showContent && (
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: "-9999px",
            width: "1px",
            height: "1px",
            visibility: "hidden",
            pointerEvents: "none",
            overflow: "hidden",
            contain: "strict",
          }}
          aria-hidden="true"
          tabIndex={-1}
        >
          {/* Website loads here in the background */}
          {children}
        </div>
      )}
    </>
  );
});

AppLoader.displayName = "AppLoader";

export default AppLoader;
