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

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 8;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsLoaded(true);
          document.body.style.overflow = "";
        }, 500);
      }
      setProgress(currentProgress);
    }, 80);

    return () => {
      clearInterval(interval);
      document.body.style.overflow = "";
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

          // Animate: collapse loader height to 0 while scroll follows
          const tl = gsap.timeline({
            onComplete: () => {
              setHasScrolledPast(true);
              requestAnimationFrame(() => {
                ScrollTrigger.refresh();
              });
            },
          });

          tl.to(container, {
            height: 0,
            duration: 0.6,
            ease: "power2.inOut",
            onUpdate: function () {
              // Compensate scroll so user doesn't feel a jump
              const lostHeight = initialHeight * this.progress();
              window.scrollTo(0, initialHeight - lostHeight);
            },
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
