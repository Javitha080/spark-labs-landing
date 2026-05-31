import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { clubLogo } from "@/components/ClubLogo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function GSAPLoader() {
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasScrolledPast, setHasScrolledPast] = useState(false);

  // Preload Simulation
  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    // Stop Lenis if it exists
    const tryStopLenis = () => {
      if ((window as any).lenis) {
         (window as any).lenis.stop();
      }
    };
    tryStopLenis();
    // In case Lenis loads after this component mounts
    const lenisInterval = setInterval(tryStopLenis, 100);

    // Block native scrolling events
    const blockScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    const blockKeyScroll = (e: KeyboardEvent) => {
      const keys = ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
      if (keys.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', blockScroll, { passive: false, capture: true });
    window.addEventListener('DOMMouseScroll', blockScroll, { passive: false, capture: true });
    window.addEventListener('keydown', blockKeyScroll, { passive: false, capture: true });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 8;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsLoaded(true);
          document.body.style.overflow = "";
          clearInterval(lenisInterval);
          if ((window as any).lenis) (window as any).lenis.start();
          
          window.removeEventListener('wheel', blockScroll, { capture: true } as any);
          window.removeEventListener('touchmove', blockScroll, { capture: true } as any);
          window.removeEventListener('DOMMouseScroll', blockScroll, { capture: true } as any);
          window.removeEventListener('keydown', blockKeyScroll, { capture: true } as any);
        }, 500);
      }
      setProgress(currentProgress);
    }, 80);

    return () => {
      clearInterval(interval);
      clearInterval(lenisInterval);
      document.body.style.overflow = "";
      if ((window as any).lenis) (window as any).lenis.start();
      
      window.removeEventListener('wheel', blockScroll, { capture: true } as any);
      window.removeEventListener('touchmove', blockScroll, { capture: true } as any);
      window.removeEventListener('DOMMouseScroll', blockScroll, { capture: true } as any);
      window.removeEventListener('keydown', blockKeyScroll, { capture: true } as any);
    };
  }, []);

  // GSAP Scroll Animation
  useGSAP(() => {
    if (!isLoaded || !containerRef.current || hasScrolledPast) return;

    const container = containerRef.current;
    const initialHeight = container.offsetHeight;

    const st = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      onUpdate: (self) => {
        // When scrub reaches the end, smoothly collapse the loader
        if (self.progress >= 1 && !container.dataset.collapsing) {
          container.dataset.collapsing = "true";

          // Kill this ScrollTrigger so it doesn't interfere
          st.kill();

          // Reset scroll to 0 immediately without stopping lenis
          // This allows lenis to actually process the scrollTo command and keeps natural momentum
          if ((window as any).lenis) {
            (window as any).lenis.scrollTo(0, { immediate: true });
          } else {
            window.scrollTo(0, 0);
          }

          // Convert to a fixed overlay so it stops pushing the page down
          // This instantly snaps the Hero section to the top of the viewport underneath
          gsap.set(container, {
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            zIndex: 9999,
          });

          // Smoothly fade it out
          gsap.to(container, {
            opacity: 0,
            duration: 0.8,
            ease: "power2.inOut",
            onComplete: () => {
              setHasScrolledPast(true);
              ScrollTrigger.refresh();
            }
          });
        }
      },
    });

    // Scale up the content massively to cover the screen
    gsap.to(contentRef.current, {
      scale: 60,
      opacity: 0,
      ease: "power2.inOut",
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    // Fade out the dark background towards the end
    gsap.to(bgRef.current, {
      opacity: 0,
      ease: "power2.in",
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

  }, { dependencies: [isLoaded, hasScrolledPast], revertOnUpdate: true });

  if (hasScrolledPast) return null;

  return (
    <div ref={containerRef} className="relative w-full h-[250vh] z-[9999]">
      <div
        ref={bgRef}
        className="sticky top-0 left-0 w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden"
      >
        <div ref={contentRef} className="flex flex-col items-center justify-center relative">
          <img
            src={clubLogo}
            alt="YICDVP Logo"
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 mb-8 object-contain"
          />

          <div className="relative font-display font-bold text-5xl sm:text-7xl md:text-9xl tracking-[0.2em] uppercase">
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}
            >
              YICDVP
            </span>
            <span
              className="absolute left-0 top-0 text-white overflow-hidden transition-all duration-100 ease-out"
              style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
            >
              YICDVP
            </span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className={cn(
            "absolute bottom-12 flex flex-col items-center gap-2 text-white/50 transition-opacity duration-1000",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="text-xs sm:text-sm tracking-[0.3em] uppercase font-mono">Scroll Me</span>
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 animate-none" />
        </div>
      </div>
    </div>
  );
}
