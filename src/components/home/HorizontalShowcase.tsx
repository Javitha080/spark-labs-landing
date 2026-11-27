import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight, Lightbulb, Zap, Globe } from "lucide-react";
import { scrollToTarget } from "@/lib/scroll";
import { useMediaQuery } from "@/hooks/useMediaQuery";

gsap.registerPlugin(useGSAP, ScrollTrigger, Observer);

const features = [
  {
    title: "Innovate Daily",
    desc: "Building the future of robotics and IoT right in our labs.",
    icon: Lightbulb,
    color: "hsl(var(--primary))"
  },
  {
    title: "Sustainable Energy",
    desc: "Harnessing solar power for our school's eco-friendly projects.",
    icon: Zap,
    color: "hsl(var(--accent))"
  },
  {
    title: "Global Impact",
    desc: "Connecting with innovators worldwide through open source.",
    icon: Globe,
    color: "hsl(var(--muted-foreground))"
  }
];

export default function HorizontalShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const activeMobileRef = useRef(0);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const goToMobilePanel = (index: number) => {
    const clamped = Math.max(0, Math.min(features.length - 1, index));
    activeMobileRef.current = clamped;
    setActiveMobileIndex(clamped);
    if (mobileTrackRef.current) {
      gsap.to(mobileTrackRef.current, {
        xPercent: -clamped * 100,
        duration: reducedMotion ? 0 : 0.4,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  };

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const panels = gsap.utils.toArray<HTMLElement>(".horizontal-panel", containerRef.current || undefined);
      const container = scrollRef.current;
      const wrapper = containerRef.current;

      if (!container || !wrapper || panels.length === 0) return;

      const cards = panels.map((panel) => panel.querySelector<HTMLElement>(".showcase-card"));
      const clampProgress = gsap.utils.clamp(-1, 1);
      const setOpacity = cards.map((card) => (card ? gsap.quickSetter(card, "opacity") : null));
      const setTransform = cards.map((card) => (card ? gsap.quickSetter(card, "transform") : null));
      const lastCardProgress = cards.map(() => Number.NaN);

      gsap.set(wrapper, { perspective: 1200 });

      cards.forEach((card, i) => {
        if (!card) return;
        const initialRotateY = i % 2 === 0 ? 5 : -5;
        setOpacity[i]?.(0.3);
        setTransform[i]?.(`translate3d(0px, 0px, -300px) rotateY(${initialRotateY}deg) scale(0.8)`);
      });

      gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: wrapper,
          pin: true,
          scrub: 1,
          snap: 1 / (panels.length - 1),
          end: () => "+=" + container.offsetWidth,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          refreshPriority: 1,
          onUpdate: (self) => {
            const progress = self.progress;
            const span = panels.length - 1;

            for (let i = 0; i < cards.length; i++) {
              if (!cards[i]) continue;
              const clampedProgress = clampProgress(progress * span - i);
              if (Math.abs(clampedProgress - lastCardProgress[i]) < 0.0004) continue;
              lastCardProgress[i] = clampedProgress;

              const absP = Math.abs(clampedProgress);
              const zDistance = absP * -400;
              const scaleValue = 1 - absP * 0.25;
              const opacityValue = 1 - absP * 0.6;
              const rotateY = clampedProgress * 8;

              setOpacity[i]?.(opacityValue);
              setTransform[i]?.(
                `translate3d(0px, 0px, ${zDistance.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scaleValue.toFixed(4)})`,
              );
            }
          },
        },
      });
    });

    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const track = mobileTrackRef.current;
      if (!track) return;

      gsap.set(track, { xPercent: -activeMobileRef.current * 100 });

      const obs = Observer.create({
        target: track,
        type: "touch,pointer",
        lockAxis: true,
        dragMinimum: 12,
        preventDefault: false,
        onLeft: () => {
          const next = Math.min(features.length - 1, activeMobileRef.current + 1);
          activeMobileRef.current = next;
          setActiveMobileIndex(next);
          gsap.to(track, { xPercent: -next * 100, duration: 0.4, ease: "power2.out", overwrite: "auto" });
        },
        onRight: () => {
          const prev = Math.max(0, activeMobileRef.current - 1);
          activeMobileRef.current = prev;
          setActiveMobileIndex(prev);
          gsap.to(track, { xPercent: -prev * 100, duration: 0.4, ease: "power2.out", overwrite: "auto" });
        },
      });

      return () => {
        obs.kill();
      };
    });

    const rafId = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      mm.revert();
    };
  }, { scope: containerRef, dependencies: [isDesktop, reducedMotion], revertOnUpdate: true });

  // Reduced-motion fallback: static vertical stack (no pin, scrub, or swipe motion)
  if (reducedMotion) {
    return (
      <section ref={containerRef} className="relative bg-background overflow-hidden py-20">
        <div className="px-6 md:px-20 mb-10">
          <h2 className="text-4xl md:text-6xl font-display font-bold text-foreground">
            Our Vision <br />
            <span className="gradient-text">In Motion</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-sm">
            Scroll down to explore how we are changing the world, one project at a time.
          </p>
        </div>
        <div className="flex flex-col gap-6 px-6 md:px-20">
          {features.map((feature) => (
            <div key={feature.title} className="w-full flex items-center justify-center">
              <div className="glass-pane w-full max-w-2xl p-5 sm:p-6 md:p-16 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div
                  className="size-24 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `radial-gradient(circle, ${feature.color}40 0%, transparent 70%)`, border: `1px solid ${feature.color}80` }}
                >
                  <feature.icon className="size-10" style={{ color: feature.color }} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => scrollToTarget("projects")}
                    aria-label="Explore projects"
                    className="mt-6 inline-flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold uppercase tracking-wider group text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                  >
                    Explore Project
                    <ArrowRight className="size-4 group-hover:translate-x-2 transition-transform" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Mobile (<768px): horizontal swipeable showcase without hijacking vertical scroll
  if (!isDesktop) {
    return (
      <section ref={containerRef} className="relative bg-background overflow-hidden py-16">
        <div className="px-4 sm:px-6 mb-8">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Our Vision <br />
            <span className="gradient-text">In Motion</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-base max-w-sm">
            Swipe or use the controls below to explore how we are changing the world, one project at a time.
          </p>
        </div>

        <div className="overflow-hidden" style={{ touchAction: "pan-y" }}>
          <div
            ref={mobileTrackRef}
            className="flex will-change-transform"
            style={{ touchAction: "pan-y" }}
          >
            {features.map((feature) => (
              <div key={feature.title} className="w-full shrink-0 px-4 sm:px-6">
                <div className="glass-pane w-full max-w-xl mx-auto p-6 rounded-[2rem] flex flex-col items-center text-center gap-6">
                  <div
                    className="size-20 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `radial-gradient(circle, ${feature.color}40 0%, transparent 70%)`, border: `1px solid ${feature.color}80` }}
                  >
                    <feature.icon className="size-9" style={{ color: feature.color }} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </p>
                    <button
                      type="button"
                      onClick={() => scrollToTarget("projects")}
                      aria-label="Explore projects"
                      className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-semibold uppercase tracking-wider group text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                    >
                      Explore Project
                      <ArrowRight className="size-4 group-hover:translate-x-2 transition-transform" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 px-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToMobilePanel(activeMobileIndex - 1)}
            disabled={activeMobileIndex === 0}
            aria-label="Previous showcase slide"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border border-border/60 bg-card/70 text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1" role="tablist" aria-label="Showcase slides">
            {features.map((feature, idx) => (
              <button
                key={feature.title}
                type="button"
                role="tab"
                aria-selected={activeMobileIndex === idx}
                aria-label={`Show ${feature.title}`}
                onClick={() => goToMobilePanel(idx)}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all duration-300 ${
                    activeMobileIndex === idx ? "w-7 bg-primary" : "w-2.5 bg-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToMobilePanel(activeMobileIndex + 1)}
            disabled={activeMobileIndex === features.length - 1}
            aria-label="Next showcase slide"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border border-border/60 bg-card/70 text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="relative md:h-[100dvh] bg-background overflow-hidden flex flex-col" style={{ transformStyle: "preserve-3d" }}>
      <div className="relative z-10 shrink-0 pt-24 md:pt-28 pb-4 sm:pb-6 px-10 md:px-20">
        <h2 className="text-4xl md:text-6xl font-display font-bold text-foreground">
          Our Vision <br/>
          <span className="gradient-text">In Motion</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-sm">
          Scroll down to explore how we are changing the world, one project at a time.
        </p>
      </div>

      <div ref={scrollRef} className="flex flex-1 min-h-0 w-[300vw] flex-nowrap items-center pb-8 md:pb-12" style={{ perspective: "1200px" }}>
        {features.map((feature) => (
          <div key={feature.title} className="horizontal-panel w-screen flex-shrink-0 flex items-center justify-center px-4 md:px-20" style={{ transformStyle: "preserve-3d" }}>
            <div
              className="showcase-card glass-pane w-full max-w-2xl p-4 sm:p-6 md:p-16 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 md:gap-12 will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div 
                className="size-24 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `radial-gradient(circle, ${feature.color}40 0%, transparent 70%)`, border: `1px solid ${feature.color}80` }}
              >
                <feature.icon className="size-10" style={{ color: feature.color }} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
                <button type="button" onClick={() => scrollToTarget("projects")} aria-label="Explore projects" className="mt-6 inline-flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold uppercase tracking-wider group text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
                  Explore Project
                  <ArrowRight className="size-4 group-hover:translate-x-2 transition-transform" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
