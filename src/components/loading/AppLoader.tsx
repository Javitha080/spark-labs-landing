import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus } from "lucide-react";
import clubLogo from "@/assets/club-logo.png";

interface AppLoaderProps {
  children: React.ReactNode;
}

const SESSION_KEY = "yicdvp_loader_shown_v10";

type LoadingPhase = "loading" | "ready" | "scrolling" | "complete";

/* ===========================================
   MODERN PROFILE CARD LOADER
   Glassmorphism + Super Ellipse + Clean Typography
   =========================================== */

// Glassmorphism Profile Card Component
const ProfileCard = memo(({
  progress,
  phase,
}: {
  progress: number;
  phase: LoadingPhase;
}) => {
  const isReady = phase === "ready";

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glassmorphism Card */}
      <div
        className="relative px-8 py-10 md:px-12 md:py-12"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderRadius: "32px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 0 80px rgba(255, 255, 255, 0.03) inset
          `,
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 rounded-[32px] pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
          }}
        />

        {/* Content */}
        <div className="relative flex flex-col items-center text-center">
          {/* Profile Image with Super Ellipse */}
          <motion.div
            className="relative mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-[28px]"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)",
                padding: "2px",
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Image container */}
            <div
              className="relative w-24 h-24 md:w-28 md:h-28 overflow-hidden"
              style={{
                borderRadius: "28px",
                background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              }}
            >
              <img
                src={clubLogo}
                alt="Young Innovators Club"
                className="w-full h-full object-cover"
                style={{
                  filter: "contrast(1.05) saturate(1.1)",
                }}
              />
            </div>

            {/* Verification Badge */}
            <motion.div
              className="absolute -bottom-1 -right-1 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 15 }}
            >
              <div
                className="w-7 h-7 flex items-center justify-center"
                style={{
                  background: "#22C55E",
                  borderRadius: "50%",
                  border: "2px solid rgba(0, 0, 0, 0.3)",
                  boxShadow: "0 2px 8px rgba(34, 197, 94, 0.4)",
                }}
              >
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
            </motion.div>
          </motion.div>

          {/* Typography - Clean Sans-serif Hierarchy */}
          <motion.div
            className="space-y-1 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Bold Name */}
            <h1
              className="text-xl md:text-2xl font-semibold text-white tracking-tight"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              Young Innovators
            </h1>
            
            {/* Lighter Grey Bio */}
            <p
              className="text-sm md:text-base font-normal"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              Dharmapala Vidyalaya
            </p>
          </motion.div>

          {/* Ghost Button - Pill Shape */}
          <motion.button
            className="group relative flex items-center gap-2 px-6 py-2.5 mb-8"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              borderRadius: "9999px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            whileHover={{
              background: "rgba(255, 255, 255, 0.1)",
              scale: 1.02,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span
              className="text-sm font-medium text-white/90"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              Follow
            </span>
            <Plus className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
          </motion.button>

          {/* Progress Section */}
          <AnimatePresence mode="wait">
            {!isReady ? (
              <motion.div
                key="progress"
                className="w-full max-w-[200px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Progress Bar */}
                <div
                  className="h-1 w-full rounded-full overflow-hidden mb-3"
                  style={{ background: "rgba(255, 255, 255, 0.06)" }}
                >
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.8))",
                    }}
                  >
                    <motion.div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"
                      style={{
                        boxShadow: "0 0 10px rgba(255,255,255,0.5)",
                      }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </motion.div>
                </div>

                {/* Progress Text */}
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs font-medium"
                    style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      color: "rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    {Math.round(progress)}%
                  </span>
                  <motion.span
                    className="text-xs font-medium"
                    style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      color: "rgba(255, 255, 255, 0.3)",
                    }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Loading
                  </motion.span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <span
                  className="text-xs font-medium uppercase tracking-[0.2em]"
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: "rgba(255, 255, 255, 0.4)",
                  }}
                >
                  Tap to explore
                </span>
                <motion.div
                  className="w-10 h-10 flex items-center justify-center rounded-full"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subtle outer glow */}
      <div
        className="absolute -inset-4 rounded-[40px] pointer-events-none -z-10"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
    </motion.div>
  );
});

ProfileCard.displayName = "ProfileCard";

// Main Loader UI
const LoaderUI = memo(({
  progress,
  phase,
  onScrollDismiss,
}: {
  progress: number;
  phase: LoadingPhase;
  onScrollDismiss: () => void;
}) => {
  // Listen for scroll/tap to dismiss
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

    const handleClick = () => onScrollDismiss();

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouch.start, { passive: true });
    window.addEventListener("touchend", handleTouch.end, { passive: true });
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouch.start);
      window.removeEventListener("touchend", handleTouch.end);
      window.removeEventListener("click", handleClick);
    };
  }, [phase, onScrollDismiss]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        backdropFilter: "blur(0px)",
      }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d12 100%)",
      }}
      onClick={phase === "ready" ? onScrollDismiss : undefined}
    >
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 60%)",
            filter: "blur(80px)",
            top: "-20%",
            right: "-10%",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%)",
            filter: "blur(60px)",
            bottom: "-20%",
            left: "-10%",
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Profile Card */}
      <ProfileCard progress={progress} phase={phase} />

      {/* Version text */}
      <motion.div
        className="absolute bottom-6 right-6 text-[10px] font-medium tracking-widest"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "rgba(255, 255, 255, 0.15)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        YICDVP 2026
      </motion.div>
    </motion.div>
  );
});

LoaderUI.displayName = "LoaderUI";

// Main App Loader Component
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

  // Progress tracking
  useEffect(() => {
    if (!isMounted || hasSeenLoader || prefersReducedMotion) return;

    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      let targetProgress: number;

      if (elapsed < 600) {
        targetProgress = (elapsed / 600) * 40;
      } else if (elapsed < 1500) {
        targetProgress = 40 + ((elapsed - 600) / 900) * 40;
      } else {
        targetProgress = 80 + Math.min((elapsed - 1500) / 500, 1) * 20;
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
      <div
        className="fixed inset-0 z-[200]"
        style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)" }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
