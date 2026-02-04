import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, useMemo, memo } from "react";
import clubLogo from "../../assets/club-logo.png";

interface Logo3DProps {
  isAnimating: boolean;
  phase?: "initial" | "logo" | "flythrough" | "transition" | "complete";
  isMobile?: boolean;
  progress?: number;
}

/**
 * Premium Logo3D Component - Cinematic Text-Based Experience
 * 
 * Features:
 * - 3D text "YICDVP" with depth layers and perspective
 * - Character-by-character stagger animation
 * - Glitch effect at random intervals
 * - Pulsing glow rings
 * - Club logo integration
 * - Floating atmospheric particles
 */
const Logo3D = memo(({ isAnimating, phase = "logo", isMobile = false, progress = 0 }: Logo3DProps) => {
  const [mounted, setMounted] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  // Motion values for dynamic effects
  const glowIntensity = useMotionValue(0);
  const glowOpacity = useTransform(glowIntensity, [0, 1], [0.3, 0.8]);
  const glowScale = useTransform(glowIntensity, [0, 1], [1, 1.2]);

  // Check reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Mount animation
  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Random glitch effect
  useEffect(() => {
    if (prefersReducedMotion || !isAnimating) return;

    const triggerGlitch = () => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    };

    // Random glitch intervals between 2-5 seconds
    const scheduleNextGlitch = () => {
      const delay = 2000 + Math.random() * 3000;
      return setTimeout(() => {
        triggerGlitch();
        scheduleNextGlitch();
      }, delay);
    };

    const timeoutId = scheduleNextGlitch();
    return () => clearTimeout(timeoutId);
  }, [prefersReducedMotion, isAnimating]);

  // Animate glow based on progress
  useEffect(() => {
    const targetIntensity = Math.min(progress / 80, 1);
    animate(glowIntensity, targetIntensity, { duration: 0.5, ease: "easeOut" });
  }, [progress, glowIntensity]);

  // Logo text characters
  const logoChars = "YICDVP".split("");

  // Floating particles around logo
  const particles = useMemo(() => {
    const count = isMobile ? 10 : 25;
    return [...Array(count)].map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * (isMobile ? 300 : 500),
      y: (Math.random() - 0.5) * (isMobile ? 200 : 350),
      size: 1 + Math.random() * 2.5,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.5,
    }));
  }, [isMobile]);

  // Pulsing glow rings
  const glowRings = useMemo(() => {
    if (isMobile || prefersReducedMotion) return [];
    return [
      { size: 300, duration: 3, delay: 0, opacity: 0.08 },
      { size: 450, duration: 4, delay: 0.8, opacity: 0.05 },
      { size: 600, duration: 5, delay: 1.6, opacity: 0.03 },
    ];
  }, [isMobile, prefersReducedMotion]);

  // Loading placeholder
  if (!mounted) {
    return (
      <div
        className="relative flex items-center justify-center min-h-[250px] sm:min-h-[300px]"
        role="status"
        aria-label="Loading"
      >
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/5 animate-pulse" />
      </div>
    );
  }

  // Reduced motion: simple fade
  if (prefersReducedMotion) {
    return (
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-5xl font-black text-white tracking-[0.2em]"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          YICDVP
        </motion.div>
        <motion.img
          src={clubLogo}
          alt="Young Innovators Club Logo"
          className="w-16 h-16 mt-4 object-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative select-none flex flex-col items-center justify-center"
      style={{
        perspective: isMobile ? "800px" : "1500px",
        perspectiveOrigin: "center center",
      }}
    >
      {/* Ambient glow backdrop */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: isMobile ? 280 : 500,
          height: isMobile ? 200 : 350,
          opacity: glowOpacity,
          scale: glowScale,
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 40%, transparent 70%)",
          filter: isMobile ? "blur(50px)" : "blur(80px)",
        }}
        aria-hidden="true"
      />

      {/* Pulsing glow rings */}
      {glowRings.length > 0 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          aria-hidden="true"
        >
          {glowRings.map((ring, index) => (
            <motion.div
              key={index}
              className="absolute rounded-full border border-white/20"
              style={{
                width: ring.size,
                height: ring.size,
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [ring.opacity, ring.opacity * 2, ring.opacity],
              }}
              transition={{
                duration: ring.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: ring.delay,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-visible pointer-events-none" aria-hidden="true">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-white"
            style={{
              width: particle.size,
              height: particle.size,
              left: "50%",
              top: "50%",
            }}
            initial={{
              x: particle.x,
              y: particle.y,
              opacity: 0,
            }}
            animate={{
              x: [particle.x, particle.x + (Math.random() - 0.5) * 60, particle.x],
              y: [particle.y, particle.y - 100, particle.y],
              opacity: [0, particle.opacity, 0],
              scale: [0.5, 1.2, 0.5],
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

      {/* 3D Logo Text Container */}
      <motion.div
        className="relative z-10"
        style={{
          transformStyle: "preserve-3d",
        }}
        initial={{ rotateX: 25, rotateY: -5, scale: 0.6, opacity: 0 }}
        animate={isAnimating ? {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          opacity: 1,
        } : {}}
        transition={{
          duration: 1.5,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* Main Logo Text with 3D Depth */}
        <div className="relative" style={{ transformStyle: "preserve-3d" }}>
          {/* Background depth layers */}
          {!isMobile && [...Array(4)].map((_, layerIndex) => (
            <div
              key={layerIndex}
              className="absolute inset-0 flex justify-center"
              style={{
                transform: `translateZ(${-(layerIndex + 1) * 8}px)`,
                opacity: 0.15 - layerIndex * 0.03,
              }}
              aria-hidden="true"
            >
              <span
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.15em] sm:tracking-[0.2em] text-white/30"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                YICDVP
              </span>
            </div>
          ))}

          {/* Main text with character animation */}
          <div className="flex justify-center relative">
            {logoChars.map((char, index) => (
              <motion.span
                key={index}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white relative"
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  letterSpacing: isMobile ? "0.1em" : "0.15em",
                  textShadow: `
                    0 0 20px rgba(255,255,255,0.4),
                    0 0 40px rgba(255,255,255,0.2),
                    0 0 60px rgba(255,255,255,0.1)
                  `,
                  transform: glitchActive && index % 2 === 0
                    ? `translateX(${(Math.random() - 0.5) * 8}px) skewX(${(Math.random() - 0.5) * 10}deg)`
                    : "none",
                  transition: glitchActive ? "none" : "transform 0.1s ease-out",
                }}
                initial={{
                  y: 50 + index * 10,
                  opacity: 0,
                  rotateX: -30,
                  filter: "blur(10px)",
                }}
                animate={isAnimating ? {
                  y: 0,
                  opacity: 1,
                  rotateX: 0,
                  filter: "blur(0px)",
                } : {}}
                transition={{
                  duration: 0.8,
                  delay: 0.3 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {char}
              </motion.span>
            ))}

            {/* Glitch overlay layers */}
            {glitchActive && (
              <>
                <motion.div
                  className="absolute inset-0 flex justify-center pointer-events-none"
                  style={{
                    transform: "translateX(-3px)",
                    opacity: 0.7,
                  }}
                  aria-hidden="true"
                >
                  <span
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-cyan-400/50"
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      letterSpacing: isMobile ? "0.1em" : "0.15em",
                    }}
                  >
                    YICDVP
                  </span>
                </motion.div>
                <motion.div
                  className="absolute inset-0 flex justify-center pointer-events-none"
                  style={{
                    transform: "translateX(3px)",
                    opacity: 0.7,
                  }}
                  aria-hidden="true"
                >
                  <span
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-red-400/50"
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      letterSpacing: isMobile ? "0.1em" : "0.15em",
                    }}
                  >
                    YICDVP
                  </span>
                </motion.div>
              </>
            )}
          </div>

          {/* Shine sweep effect */}
          {!isMobile && phase !== "initial" && (
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <motion.div
                className="absolute inset-y-0 w-32"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                }}
                animate={{ x: ["-200%", "500%"] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}
        </div>

        {/* Floating animation for idle state */}
        {(phase === "flythrough" || phase === "complete") && (
          <motion.div
            className="absolute inset-0"
            animate={{
              y: [0, -8, 0],
              rotateZ: [-0.5, 0.5, -0.5],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            aria-hidden="true"
          />
        )}
      </motion.div>

      {/* Club Logo - Smaller, below text */}
      <motion.div
        className="relative z-10 mt-6 sm:mt-8"
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={isAnimating ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ delay: 1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.img
          src={clubLogo}
          alt="Young Innovators Club Emblem"
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
          style={{
            filter: "drop-shadow(0 0 15px rgba(255,255,255,0.3))",
          }}
          animate={(phase === "flythrough" || phase === "complete") ? {
            filter: [
              "drop-shadow(0 0 10px rgba(255,255,255,0.2))",
              "drop-shadow(0 0 20px rgba(255,255,255,0.4))",
              "drop-shadow(0 0 10px rgba(255,255,255,0.2))",
            ],
          } : {}}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Subtitle with dramatic reveal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isAnimating ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mt-4 sm:mt-6 z-20"
      >
        <motion.p
          className="text-[10px] xs:text-xs sm:text-sm text-white/60 tracking-[0.25em] sm:tracking-[0.4em] uppercase font-medium"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={isAnimating ? { opacity: 0.7, letterSpacing: isMobile ? "0.2em" : "0.35em" } : {}}
          transition={{ delay: 1.4, duration: 1 }}
        >
          Young Innovators Club
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isAnimating ? { opacity: 0.4 } : {}}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="text-[9px] xs:text-[10px] sm:text-xs text-white/35 tracking-[0.15em] sm:tracking-[0.2em] uppercase mt-1.5"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Dharmapala Vidyalaya
        </motion.p>
      </motion.div>
    </div>
  );
});

Logo3D.displayName = "Logo3D";

export default Logo3D;
