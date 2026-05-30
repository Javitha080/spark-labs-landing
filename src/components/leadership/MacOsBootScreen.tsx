import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useTheme } from "next-themes";
import { clubLogo } from "@/components/ClubLogo";
import OptimizedImage from "@/components/ui/OptimizedImage";
import LiquidGlass from "@/components/ui/LiquidGlass";

interface MacOsBootScreenProps {
  onComplete: () => void;
}

const bootMessages = [
  "Loading kernel modules...",
  "Initializing Spark OS Sonoma...",
  "Mounting encrypted drives...",
  "Loading leadership profiles...",
  "Starting desktop environment...",
];

export default function MacOsBootScreen({ onComplete }: MacOsBootScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Resolve true theme (fallback to dark by default)
  const isLight = theme === "light";

  // Web Audio API Synthesizer for macOS Startup Chime
  const playSynthesizedChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
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

  useEffect(() => {
    // Fallback timeout to guarantee booting completes even if GSAP stalls
    const fallbackId = setTimeout(() => {
      console.warn("Boot animation fallback triggered");
      onComplete();
    }, 7000);

    const ctx = gsap.context(() => {
      // 1. Initial fade-in of logos
      gsap.fromTo(
        logosRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }
      );

      // 2. Stagger-in status messages
      if (statusRef.current) {
        const messages = statusRef.current.querySelectorAll(".boot-msg");
        gsap.fromTo(
          messages,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.5,
            delay: 0.6,
            ease: "power2.out",
          }
        );
      }

      // 3. Animate progress bar filling up
      gsap.fromTo(
        progressBarRef.current,
        { width: "0%" },
        {
          width: "100%",
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
    }, containerRef);

    return () => {
      ctx.revert();
      clearTimeout(fallbackId);
    };
  }, [onComplete]);

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
          <LiquidGlass variant="intense" rounded="2xl" className={`size-16 shrink-0 p-3.5 border shadow-lg flex items-center justify-center transition-colors duration-300 ${
            isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
          }`}>
            <img
              src={isLight ? "/assets/Apple_logo_black.svg" : "/assets/Apple_logo_white.svg"}
              alt="Apple Logo"
              className="size-8 object-contain opacity-95 filter drop-shadow-sm"
            />
          </LiquidGlass>

          {/* Divider */}
          <div className={`h-10 w-px ${isLight ? "bg-black/15" : "bg-white/20"}`} />

          {/* Club Logo (Symmetrical glass panel) */}
          <LiquidGlass variant="intense" rounded="2xl" className={`size-16 shrink-0 p-2.5 border shadow-lg flex items-center justify-center transition-colors duration-300 ${
            isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
          }`}>
            <OptimizedImage
              src={clubLogo}
              alt="YICDVP Logo"
              className="size-full object-contain opacity-95"
            />
          </LiquidGlass>
        </div>

        {/* Loading Bar */}
        <div className={`w-48 h-1.5 rounded-full overflow-hidden relative shadow-inner mb-6 ${
          isLight ? "bg-black/10" : "bg-white/20"
        }`}>
          <div
            ref={progressBarRef}
            className={`h-full rounded-full ${
              isLight ? "bg-black shadow-[0_0_4px_rgba(0,0,0,0.2)]" : "bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
            }`}
            style={{ width: "0%" }}
          />
        </div>

        {/* Boot Status Messages */}
        <div ref={statusRef} className="flex flex-col items-center gap-1 h-28">
          {bootMessages.map((msg, i) => (
            <span
              key={i}
              className={`boot-msg text-[10px] font-mono tracking-wide opacity-0 ${
                isLight ? "text-black/40" : "text-white/30"
              }`}
            >
              {msg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
