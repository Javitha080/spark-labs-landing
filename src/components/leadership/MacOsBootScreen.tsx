import { lazy, Suspense, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
import { useTheme } from "next-themes";
import { clubLogo } from "@/components/ClubLogo";
import OptimizedImage from "@/components/common/OptimizedImage";
import GlassSurface from "@/components/glass/GlassSurface";
import ShinyText from "@/components/reactbits/ShinyText";
import { cn } from "@/lib/utils";

// FeralUI Fur boot wordmark (npm package, MIT, canvas 2D, no runtime deps).
// Same convention as the footer: fur.css is side-effect chrome, Fur itself is
// lazy so it never rides on the page bundle, and a plain span holds the
// layout (and renders alone under reduced motion) while/instead of the coat.
import "feral-fur/fur.css";

const Fur = lazy(() =>
  import("feral-fur").then((m) => ({ default: m.Fur })),
);

const BOOT_FUR_OK =
    !(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

interface MacOsBootScreenProps {
  onComplete: () => void;
}


export default function MacOsBootScreen({ onComplete }: MacOsBootScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<HTMLDivElement>(null);
  // Check for prior user interaction to bypass autoplay restrictions
  // automatically. Lazy init reads the platform flag directly instead of
  // mirroring it through a synchronous setState-in-effect round trip.
  const [hasInteracted, setHasInteracted] = useState(
    () => Boolean(navigator.userActivation?.hasBeenActive),
  );
  const { theme } = useTheme();

  // Resolve true theme (fallback to dark by default)
  const isLight = theme === "light";

  // Placeholder for the Fur wordmark: the Suspense fallback while the lazy
  // fur chunk loads, and the full stand-in for reduced-motion users. It must
  // unmount once the coat mounts: the span's glyph metrics differ from the
  // drawn ones, so its shapes peek through the fur's transparent hair gaps
  // and scramble the wordmark.
  const wordmarkFallback = (
    <span
      aria-hidden="true"
      className={cn(
        "absolute inset-0 flex items-center justify-center font-display font-black uppercase tracking-tight leading-none",
        isLight ? "text-black/85" : "text-white/85"
      )}
      style={{ fontSize: "clamp(1.75rem, 5vw, 2.4rem)" }}
    >
      YICDVP
    </span>
  );

  // Fall back to unlocking on the first user gesture in browsers or code paths
  // where user activation hasn't accumulated yet.
  useEffect(() => {
    if (hasInteracted) return;
    const unlock = () => setHasInteracted(true);
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [hasInteracted]);

  // Web Audio API Synthesizer for macOS Startup Chime
  const playSynthesizedChime = () => {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      
      // Prevent autoplay policy warning gracefully
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      
      // Warm macOS Chime chord frequencies
      // F2 (87.31 Hz), C3 (130.81 Hz), F3 (174.61 Hz), A3 (220.00 Hz), C4 (261.63 Hz), F4 (349.23 Hz)
      const freqs = [87.31, 130.81, 174.61, 220.00, 261.63, 349.23];
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
      masterGain.connect(ctx.destination);

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const bandGain = ctx.createGain();
        
        // Blend sawtooth and triangle for warm, hollow analog synthesis
        osc.type = idx % 2 === 0 ? "triangle" : "sawtooth";
        osc.frequency.value = freq;
        
        // Detune slightly for lush chorusing effect
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
        
        // Apply low pass filter to sawtooths to remove harshness
        if (osc.type === "sawtooth") {
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(800, now);
          osc.connect(filter);
          filter.connect(bandGain);
        } else {
          osc.connect(bandGain);
        }
        
        bandGain.gain.setValueAtTime(1 / freqs.length, now);
        bandGain.connect(masterGain);
        
        osc.start(now);
        osc.stop(now + 3.0);
      });
    } catch (e) {
      console.warn("AudioContext chime synthesis failed:", e);
    }
  };

  useGSAP(() => {
    if (!hasInteracted) return;

    // Fallback timeout to guarantee booting completes even if GSAP stalls
    const fallbackId = setTimeout(() => {
      console.warn("Boot animation fallback triggered");
      onComplete();
    }, 7000);

    // 1. Initial fade-in of logos
    gsap.fromTo(
      logosRef.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }
    );


    // 3. Animate progress bar filling up (compositor-safe: scaleX, not width)
    gsap.set(progressBarRef.current, { scaleX: 0, transformOrigin: "left center" });
    gsap.to(
      progressBarRef.current,
      {
        scaleX: 1,
        duration: 3.5,
        ease: "power1.inOut",
        delay: 0.8,
        onComplete: () => {
          // Play boot chime
          playSynthesizedChime();
          
          // Fade out booting container
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.8,
            delay: 0.5,
            ease: "power2.inOut",
            onComplete: () => {
              clearTimeout(fallbackId);
              onComplete();
            }
          });
        }
      }
    );
    return () => {
      clearTimeout(fallbackId);
    };
  }, [hasInteracted, onComplete]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 flex flex-col items-center justify-center z-[99999] select-none overflow-hidden transition-colors duration-300 ${
        isLight ? "bg-[#F5F5F7]" : "bg-black"
      }`}
    >
      <div className="flex flex-col items-center max-w-sm w-full px-8">
          {/* Apple Logo + YIC Logo side-by-side */}
          <div ref={logosRef} className="flex items-center justify-center gap-8 mb-12">
            {/* Apple Logo (Sonoma SVG themed asset in symmetrical glass panel) */}
            <GlassSurface variant="intense" rounded="2xl" className={`size-16 shrink-0 p-3.5 border shadow-lg flex items-center justify-center transition-colors duration-300 ${
              isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
            }`}>
              <img
                src={isLight ? "/assets/Apple_logo_black.svg" : "/assets/Apple_logo_white.svg"}
                alt="Apple Logo"
                className="size-8 object-contain opacity-95 filter drop-shadow-sm"
              />
            </GlassSurface>

            {/* Divider */}
            <div className={`h-10 w-px ${isLight ? "bg-black/15" : "bg-white/20"}`} />

            {/* Club Logo (Symmetrical glass panel) */}
            <GlassSurface variant="intense" rounded="2xl" className={`size-16 shrink-0 p-2.5 border shadow-lg flex items-center justify-center transition-colors duration-300 ${
              isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
            }`}>
              <OptimizedImage
                src={clubLogo}
                alt="YICDVP Logo"
                className="size-full object-contain opacity-95 bg-transparent"
              />
            </GlassSurface>
          </div>

        {/* FeralUI Fur wordmark: a pettable coat on the committee initials.
            The placeholder span shows only while the fur chunk is loading and
            stays for reduced-motion users (see wordmarkFallback above). */}
        <div
          className="relative flex w-full max-w-[240px] min-w-0 items-center justify-center mb-10"
          style={{ aspectRatio: "8 / 2" }}
        >
          {!BOOT_FUR_OK ? (
            wordmarkFallback
          ) : (
            <Suspense fallback={wordmarkFallback}>
              <Fur
                text="YICDVP"
                color={isLight ? "#272B35" : "#C9CDFB"}
                fluff={1}
                density={0.9}
                mess={0.24}
                seed={21}
                className="size-full"
                style={{ width: "100%", height: "100%" }}
              />
            </Suspense>
          )}
        </div>

          {/* Loading Bar or Interaction Prompt */}
          {!hasInteracted ? (
            <ShinyText
              text="Click anywhere to boot"
              color={isLight ? "rgba(39,43,53,0.55)" : "rgba(235,238,255,0.55)"}
              shineColor={isLight ? "rgba(139,92,246,0.95)" : "rgba(216,220,255,0.95)"}
              speed={2.2}
              glow={0.2}
              className="mt-4 text-xs tracking-widest uppercase font-semibold"
            />
          ) : (
            <div className={`w-48 h-1.5 rounded-full overflow-hidden relative shadow-inner mb-6 ${
              isLight ? "bg-black/10" : "bg-white/20"
            }`}>
              <div
                ref={progressBarRef}
                className={`h-full rounded-full ${
                  isLight ? "bg-black shadow-[0_0_4px_rgba(0,0,0,0.2)]" : "bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                }`}
                style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
              />
            </div>
          )}

        </div>
    </div>
  );
}
