import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import Logo3D from "./Logo3D";

interface CinematicLoaderProps {
  progress: number;
  isVisible: boolean;
  onComplete: () => void;
}

type AnimationPhase = "initial" | "logo" | "flythrough" | "transition" | "complete";

/**
 * Premium Cinematic Loader - Full Immersive Experience
 * 
 * Features:
 * - Deep black monochrome environment
 * - Perspective grid floor with animation
 * - Atmospheric floating particles
 * - Horizontal scan lines with glow
 * - 3D camera fly-through exit transition
 * - Motion blur and color blend effects
 * - Dramatic progress bar with particles
 */
const CinematicLoader = memo(({ progress, isVisible, onComplete }: CinematicLoaderProps) => {
  const [phase, setPhase] = useState<AnimationPhase>("initial");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Motion values for smooth interpolation
  const progressValue = useMotionValue(0);
  const progressWidth = useTransform(progressValue, [0, 100], ["0%", "100%"]);
  const progressGlow = useTransform(progressValue, [0, 50, 100], [0.3, 0.6, 1]);
  const environmentPulse = useTransform(progressValue, [0, 50, 100], [0.02, 0.04, 0.06]);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Device detection
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    checkDevice();
    const rafId = requestAnimationFrame(() => setMounted(true));

    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkDevice, 100);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Animate progress smoothly
  useEffect(() => {
    animate(progressValue, progress, {
      duration: 0.4,
      ease: "easeOut",
    });
  }, [progress, progressValue]);

  // Phase progression
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (progress < 10) {
        setPhase("initial");
      } else if (progress < 35) {
        setPhase("logo");
      } else if (progress < 80) {
        setPhase("flythrough");
      } else if (progress < 100) {
        setPhase("transition");
      } else {
        setPhase("complete");
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [progress]);

  // Ambient floating particles
  const [ambientParticles] = useState(() => {
    const count = 50; // max count, will be filtered by device
    return [...Array(count)].map((_, i) => ({
      id: i,
      size: 1 + Math.random() * 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 10 + Math.random() * 15,
      delay: Math.random() * 10,
      opacity: 0.15 + Math.random() * 0.35,
      xDrift: (Math.random() - 0.5) * 50,
    }));
  });

  const visibleAmbientParticles = useMemo(() => {
    const count = isMobile ? 15 : isTablet ? 30 : 50;
    return ambientParticles.slice(0, count);
  }, [isMobile, isTablet, ambientParticles]);

  // Speed lines for fly-through effect
  const [speedLinesData] = useState(() => {
    const count = 40; // max count
    return [...Array(count)].map((_, i) => ({
      id: i,
      length: 100 + Math.random() * 200,
      delay: Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.3,
    }));
  });

  const speedLines = useMemo(() => {
    if (isMobile) return [];
    const count = isTablet ? 20 : 40;
    return speedLinesData.slice(0, count).map((line, i) => ({
      ...line,
      angle: (360 / count) * i,
    }));
  }, [isMobile, isTablet, speedLinesData]);

  // Scan line count
  const scanLineCount = isMobile ? 2 : 4;

  // Status text based on phase
  const getStatusText = useCallback((): string => {
    const statusMap: Record<AnimationPhase, string> = {
      initial: "Initializing...",
      logo: "Loading assets...",
      flythrough: "Preparing experience...",
      transition: "Almost ready...",
      complete: "Welcome!",
    };
    return statusMap[phase];
  }, [phase]);

  if (!mounted) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="cinematic-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: isMobile ? 1.05 : 1.15,
            filter: prefersReducedMotion ? "none" : (isMobile ? "blur(20px) brightness(1.3)" : "blur(35px) brightness(1.5)"),
            transition: {
              duration: prefersReducedMotion ? 0.3 : (isMobile ? 0.8 : 1.2),
              ease: [0.4, 0, 0.2, 1],
            },
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{
            backgroundColor: "#050505",
            perspective: "2000px",
            perspectiveOrigin: "center center",
          }}
          role="status"
          aria-live="polite"
          aria-label={`Loading: ${Math.round(progress)}% complete`}
        >
          {/* Skip link for accessibility */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded"
          >
            Skip loading animation
          </a>

          {/* Deep vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background: "radial-gradient(ellipse at center, transparent 0%, transparent 25%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.95) 100%)",
            }}
            aria-hidden="true"
          />

          {/* Subtle noise texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
            aria-hidden="true"
          />

          {/* Perspective grid floor */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[45vh] overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1.5 }}
              style={{ opacity: environmentPulse }}
              aria-hidden="true"
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(transparent 0%, rgba(255,255,255,0.015) 100%),
                    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: "100% 100%, 50px 50px, 50px 50px",
                  transform: "perspective(500px) rotateX(75deg) translateZ(0)",
                  transformOrigin: "center bottom",
                }}
              />
              {/* Animated grid scroll */}
              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px),
                    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)
                  `,
                  backgroundSize: "50px 50px",
                  transform: "perspective(500px) rotateX(75deg)",
                  transformOrigin: "center bottom",
                }}
                animate={{ backgroundPositionY: ["0px", "50px"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}

          {/* Ambient floating particles */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              {visibleAmbientParticles.map((particle) => (
                <motion.div
                  key={particle.id}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: particle.size,
                    height: particle.size,
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                  }}
                  animate={{
                    y: [0, -120, 0],
                    x: [0, particle.xDrift, 0],
                    opacity: [0, particle.opacity, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: particle.duration,
                    repeat: Infinity,
                    delay: particle.delay,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          )}

          {/* Horizontal scan lines with glow */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {[...Array(scanLineCount)].map((_, line) => (
                <motion.div
                  key={line}
                  className="absolute left-0 right-0"
                  style={{
                    height: "1px",
                    background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.2) 50%, transparent 95%)",
                    boxShadow: "0 0 15px rgba(255,255,255,0.25), 0 0 30px rgba(255,255,255,0.1)",
                    top: `${15 + line * 25}%`,
                  }}
                  animate={{
                    x: ["-100%", "200%"],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    delay: line * 1.5,
                    ease: "linear",
                  }}
                />
              ))}
            </div>
          )}

          {/* Speed lines for fly-through phase */}
          {!prefersReducedMotion && phase === "transition" && speedLines.length > 0 && (
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              aria-hidden="true"
            >
              {speedLines.map((line) => (
                <motion.div
                  key={line.id}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: "2px",
                    height: line.length,
                    background: `linear-gradient(to bottom, transparent, rgba(255,255,255,${line.opacity}), transparent)`,
                    transformOrigin: "center top",
                    transform: `rotate(${line.angle}deg) translateY(-50vh)`,
                  }}
                  animate={{
                    height: [line.length, line.length * 2, line.length],
                    opacity: [0, line.opacity, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: line.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </motion.div>
          )}

          {/* Main content container */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center w-full px-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* 3D Logo Animation */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="w-full flex justify-center"
            >
              <Logo3D
                isAnimating={phase !== "initial"}
                phase={phase}
                isMobile={isMobile}
                progress={progress}
              />
            </motion.div>

            {/* Progress Section */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[300px] sm:max-w-sm md:max-w-md mt-12 sm:mt-16 md:mt-20 space-y-4"
            >
              {/* Progress bar container */}
              <div
                className="relative h-[2px] bg-white/10 rounded-full overflow-visible"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {/* Progress fill with gradient */}
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: progressWidth,
                    background: "linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.8) 70%, rgba(255,255,255,1) 100%)",
                  }}
                />

                {/* Glow effect on progress */}
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: progressWidth,
                    opacity: progressGlow,
                    boxShadow: "0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.1)",
                  }}
                />

                {/* Progress head glow dot */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"
                  style={{
                    left: progressWidth,
                    marginLeft: "-4px",
                    boxShadow: "0 0 8px rgba(255,255,255,0.8), 0 0 15px rgba(255,255,255,0.5), 0 0 25px rgba(255,255,255,0.3)",
                  }}
                />

                {/* Moving highlight shimmer */}
                <motion.div
                  className="absolute inset-y-0 w-16 rounded-full pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  }}
                  animate={{ x: ["-64px", "450px"] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>

              {/* Progress text */}
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <motion.span
                  className="text-white/40 tracking-[0.2em] uppercase font-light"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  {getStatusText()}
                </motion.span>
                <motion.span
                  key={Math.round(progress)}
                  initial={{ scale: 1.2, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-white/60 tabular-nums font-semibold tracking-wider text-sm sm:text-base"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {Math.round(progress)}%
                </motion.span>
              </div>
            </motion.div>
          </motion.div>

          {/* Corner frame decorations */}
          {!isMobile && (
            <div className="absolute inset-8 md:inset-12 pointer-events-none" aria-hidden="true">
              {[
                { pos: "top-0 left-0", border: "border-l-[1px] border-t-[1px]", translate: "-15" },
                { pos: "top-0 right-0", border: "border-r-[1px] border-t-[1px]", translate: "15" },
                { pos: "bottom-0 left-0", border: "border-l-[1px] border-b-[1px]", translate: "-15" },
                { pos: "bottom-0 right-0", border: "border-r-[1px] border-b-[1px]", translate: "15" },
              ].map((corner, i) => (
                <motion.div
                  key={i}
                  className={`absolute ${corner.pos} w-10 h-10 md:w-14 md:h-14 ${corner.border} border-white/15`}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -15 : 15, y: i < 2 ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }}
                />
              ))}
            </div>
          )}

          {/* Center crosshair - desktop only */}
          {!isMobile && !prefersReducedMotion && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.06, scale: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              aria-hidden="true"
            >
              <div className="relative w-48 h-48">
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white/15 rounded-full" />
              </div>
            </motion.div>
          )}

          {/* Version/branding info */}
          <motion.div
            className="absolute bottom-4 right-5 md:bottom-6 md:right-8 text-[9px] md:text-[10px] text-white/15 font-mono tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            aria-hidden="true"
          >
            YICDVP // 2026
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

CinematicLoader.displayName = "CinematicLoader";

export default CinematicLoader;
