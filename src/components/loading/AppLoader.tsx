import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import clubLogo from "@/assets/club-logo.png";

interface AppLoaderProps {
  children: React.ReactNode;
}

const SESSION_KEY = "yicdvp_loader_shown_v9";

type LoadingPhase = "loading" | "ready" | "scrolling" | "complete";

// Floating particles
const FloatingParticle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full"
    style={{
      background: 'hsl(var(--primary))',
      boxShadow: '0 0 10px hsl(var(--primary) / 0.6)',
      left: `${x}%`,
      top: `${y}%`,
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.8, 0],
      scale: [0, 1, 0],
      y: [0, -40, -80],
    }}
    transition={{
      duration: 3,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
);

// Loader UI with glassmorphism
const LoaderUI = memo(({
  progress,
  phase,
  onScrollDismiss,
}: {
  progress: number;
  phase: LoadingPhase;
  onScrollDismiss: () => void;
}) => {
  const particles = useMemo(() =>
    [...Array(12)].map((_, i) => ({
      delay: i * 0.25,
      x: 30 + Math.random() * 40,
      y: 40 + Math.random() * 20,
    })),
    []
  );

  // Listen for scroll to dismiss
  useEffect(() => {
    if (phase !== "ready") return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 10) onScrollDismiss();
    };
    const handleTouch = (() => {
      let startY = 0;
      return {
        start: (e: TouchEvent) => { startY = e.touches[0].clientY; },
        end: (e: TouchEvent) => {
          if (startY - e.changedTouches[0].clientY > 30) onScrollDismiss();
        },
      };
    })();

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouch.start, { passive: true });
    window.addEventListener("touchend", handleTouch.end, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouch.start);
      window.removeEventListener("touchend", handleTouch.end);
    };
  }, [phase, onScrollDismiss]);

  const isReady = phase === "ready";

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        filter: "blur(20px)",
        scale: 1.05,
      }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Background glow */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
        style={{ background: 'hsl(var(--primary) / 0.4)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}
      </div>

      {/* Center content */}
      <div className="relative flex flex-col items-center">
        {/* Logo with glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, type: "spring" as const }}
          className="relative mb-8"
        >
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              border: '2px solid hsl(var(--primary) / 0.3)',
              margin: -4,
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden ring-2 ring-primary/30"
            style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.3)' }}
          >
            <img
              src={clubLogo}
              alt="Young Innovators Club"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Club name */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1
            className="text-xl md:text-2xl font-display font-bold text-foreground"
            style={{ textShadow: '0 0 20px hsl(var(--primary) / 0.2)' }}
          >
            Young Innovators Club
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dharmapala Vidyalaya
          </p>
        </motion.div>

        {/* Progress bar OR scroll prompt */}
        <AnimatePresence mode="wait">
          {!isReady ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 180 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="relative"
            >
              <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full relative"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
                  }}
                >
                  <motion.div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{
                      background: 'hsl(var(--primary))',
                      boxShadow: '0 0 12px hsl(var(--primary))',
                    }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </motion.div>
              </div>
              <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                <span className="font-medium">{Math.round(progress)}%</span>
                <motion.span
                  className="font-medium"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Loading
                </motion.span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="scroll-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center gap-3 cursor-pointer"
              onClick={onScrollDismiss}
            >
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Scroll to explore
              </span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="w-6 h-6 text-primary" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

LoaderUI.displayName = "LoaderUI";

const AppLoader = memo(({ children }: AppLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasSeenLoader, setHasSeenLoader] = useState(false);
  const [phase, setPhase] = useState<LoadingPhase>("loading");
  const [showContent, setShowContent] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  // Check session
  useEffect(() => {
    setIsMounted(true);
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") {
        setHasSeenLoader(true);
        setIsLoading(false);
        setProgress(100);
        setPhase("complete");
        setShowContent(true);
      }
    } catch {
      // Silent
    }
  }, []);

  // Real progress tracking using Performance API
  useEffect(() => {
    if (!isMounted || hasSeenLoader || prefersReducedMotion) return;

    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;

      // Phase 1: 0-60% fast (JS/CSS loaded) - first 800ms
      // Phase 2: 60-90% (resources) - 800ms to 2000ms
      // Phase 3: 90-100% (complete) - check document ready
      let targetProgress: number;

      if (elapsed < 800) {
        targetProgress = (elapsed / 800) * 60;
      } else if (elapsed < 2000) {
        targetProgress = 60 + ((elapsed - 800) / 1200) * 30;
      } else {
        targetProgress = 90 + Math.min((elapsed - 2000) / 500, 1) * 10;
      }

      // Boost based on actual resource loading
      try {
        const entries = performance.getEntriesByType("resource");
        const totalResources = entries.length;
        const completedResources = entries.filter(
          (e) => (e as PerformanceResourceTiming).responseEnd > 0
        ).length;
        if (totalResources > 0) {
          const resourceProgress = (completedResources / totalResources) * 100;
          targetProgress = Math.max(targetProgress, resourceProgress * 0.9);
        }
      } catch {
        // Fallback to time-based
      }

      targetProgress = Math.min(targetProgress, 100);
      setProgress(targetProgress);

      if (targetProgress >= 100) {
        setPhase("ready");
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMounted, hasSeenLoader, prefersReducedMotion]);

  const handleScrollDismiss = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("scrolling");
    setIsLoading(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      // Silent
    }
    setTimeout(() => {
      setPhase("complete");
      setShowContent(true);
    }, 100);
  }, [phase]);

  // Skip if seen
  if (hasSeenLoader || prefersReducedMotion) {
    return <>{children}</>;
  }

  // Initial state
  if (!isMounted) {
    return (
      <div className="fixed inset-0 z-[200] bg-background" role="status" aria-live="polite">
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoaderUI
            progress={progress}
            phase={phase}
            onScrollDismiss={handleScrollDismiss}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContent && (
          <motion.div
            id="main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preload content */}
      {!showContent && (
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            width: "1px",
            height: "1px",
            visibility: "hidden",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          {children}
        </div>
      )}
    </>
  );
});

AppLoader.displayName = "AppLoader";

export default AppLoader;
