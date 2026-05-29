import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Lightbulb, Zap, Globe } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

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
    color: "hsl(var(--destructive))"
  }
];

export default function HorizontalShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const panels = gsap.utils.toArray<HTMLElement>(".horizontal-panel");
    const container = scrollRef.current;
    const wrapper = containerRef.current;
    
    if (!container || !wrapper) return;

    // Set up perspective on the wrapper for 3D depth
    gsap.set(wrapper, { perspective: 1200 });

    // Each panel starts pushed back in Z-space, scales up and flies past the camera
    panels.forEach((panel, i) => {
      const card = panel.querySelector(".showcase-card");
      if (!card) return;

      // Initial state: panel pushed back
      gsap.set(card, {
        z: -300,
        scale: 0.8,
        opacity: 0.3,
        rotateY: i % 2 === 0 ? 5 : -5,
      });
    });

    // Main horizontal scroll + zoom-through animation
    const totalWidth = container.offsetWidth;

    gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: wrapper,
        pin: true,
        scrub: 1,
        snap: 1 / (panels.length - 1),
        end: () => "+=" + totalWidth,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const numPanels = panels.length;

          panels.forEach((panel, i) => {
            const card = panel.querySelector(".showcase-card") as HTMLElement;
            if (!card) return;

            // Each panel's local progress (0 to 1 for when it's in view)
            const panelProgress = progress * (numPanels - 1) - i;
            
            // Clamp to [-1, 1] range — -1 is upcoming, 0 is centered, 1 is past
            const clampedProgress = Math.max(-1, Math.min(1, panelProgress));
            
            // Z-depth: closest (0) when panel is centered
            const zDistance = Math.abs(clampedProgress) * -400;
            const scaleValue = 1 - Math.abs(clampedProgress) * 0.25;
            const opacityValue = 1 - Math.abs(clampedProgress) * 0.6;
            const rotateY = clampedProgress * 8;

            gsap.set(card, {
              z: zDistance,
              scale: scaleValue,
              opacity: opacityValue,
              rotateY: rotateY,
            });
          });
        },
      }
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative h-screen bg-background overflow-hidden flex items-center" style={{ transformStyle: "preserve-3d" }}>
      <div className="absolute top-10 left-10 md:left-20 z-10">
        <h2 className="text-4xl md:text-6xl font-display font-bold text-foreground">
          Our Vision <br/>
          <span className="gradient-text">In Motion</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-sm">
          Scroll down to explore how we are changing the world, one project at a time.
        </p>
      </div>

      <div ref={scrollRef} className="flex h-full w-[300vw] flex-nowrap items-center pt-32 pb-20" style={{ perspective: "1200px" }}>
        {features.map((feature, i) => (
          <div key={feature.title} className="horizontal-panel w-screen flex-shrink-0 flex items-center justify-center px-4 md:px-20" style={{ transformStyle: "preserve-3d" }}>
            <div
              className="showcase-card liquid-glass w-full max-w-2xl p-10 md:p-16 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 md:gap-12 will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div 
                className="size-24 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `radial-gradient(circle, ${feature.color}40 0%, transparent 70%)`, border: `1px solid ${feature.color}80` }}
              >
                <feature.icon className="size-10" style={{ color: feature.color }} />
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
                <button type="button" className="mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider group text-foreground">
                  Learn More
                  <ArrowRight className="size-4 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
