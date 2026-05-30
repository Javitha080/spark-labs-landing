import { useRef, useEffect, useState, type ComponentType } from "react";
import { Trophy, Rocket, Zap, Award, Users, Globe } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ═══════════════════════════════════════════
   MILESTONES DATA
   ═══════════════════════════════════════════ */
interface Milestone {
  id: string;
  year: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  accentColor: string; // HSL for particles
}

const milestones: Milestone[] = [
  {
    id: "2020",
    year: "2020",
    title: "Club Founded",
    description:
      "Young Innovators Club established at Dharmapala Vidyalaya with 7 founding members and a vision for student-led STEM innovation.",
    icon: Rocket,
    accent: "from-violet-500 to-purple-600",
    accentColor: "262 83% 58%",
  },
  {
    id: "2021",
    year: "2021",
    title: "First Robotics Project",
    description:
      "Completed our first autonomous robot and entered the National Robotics Challenge, earning a special mention from judges.",
    icon: Zap,
    accent: "from-cyan-500 to-blue-600",
    accentColor: "200 80% 55%",
  },
  {
    id: "2022",
    year: "2022",
    title: "Solar Energy Lab",
    description:
      "Built and installed a solar energy monitoring station, teaching students renewable energy concepts through hands-on data collection.",
    icon: Globe,
    accent: "from-emerald-500 to-teal-600",
    accentColor: "160 70% 45%",
  },
  {
    id: "2023",
    year: "2023",
    title: "National Competition Win",
    description:
      "Won first place at the National STEM Innovation Fair with our IoT-based Smart Classroom project, beating 50+ school teams.",
    icon: Trophy,
    accent: "from-amber-500 to-orange-600",
    accentColor: "38 90% 55%",
  },
  {
    id: "2024",
    year: "2024",
    title: "Community Expansion",
    description:
      "Grew to 30+ active members, launched online STEM courses, and began mentoring students from neighbouring schools.",
    icon: Users,
    accent: "from-pink-500 to-rose-600",
    accentColor: "340 75% 60%",
  },
  {
    id: "2025",
    year: "2025",
    title: "International Recognition",
    description:
      "Featured in Asian Education Summit. Launched a coding bootcamp, 3D printing lab, and our digital learning platform.",
    icon: Award,
    accent: "from-indigo-500 to-violet-600",
    accentColor: "245 70% 58%",
  },
];

/* ═══════════════════════════════════════════
   DREAMING PARTICLES — GSAP driven
   Max 8 particles per AGENTS.md rules
   ═══════════════════════════════════════════ */
function DreamingParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create 8 particle elements
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 8; i++) {
      const el = document.createElement("div");
      el.className = "dreaming-particle absolute rounded-full pointer-events-none";
      el.style.left = `${10 + Math.random() * 80}%`;
      el.style.top = `${5 + Math.random() * 90}%`;
      el.style.width = `${3 + Math.random() * 4}px`;
      el.style.height = el.style.width;
      el.style.opacity = "0";
      el.style.backgroundColor = "hsl(var(--primary))";
      el.style.boxShadow = `0 0 10px hsl(var(--primary) / 0.5)`;
      container.appendChild(el);
      particles.push(el);
    }

    // Animate each with organic drift via GSAP
    particles.forEach((el, i) => {
      gsap.to(el, {
        x: "random(-35, 35)",
        y: "random(-45, 45)",
        opacity: "random(0.1, 0.6)",
        scale: "random(0.7, 1.5)",
        duration: 3 + Math.random() * 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * 0.25,
      });
    });

    return () => {
      particles.forEach((el) => el.remove());
    };
  }, { scope: containerRef });

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0" />;
}

/* ═══════════════════════════════════════════
   TIMELINE NODE — Glowing icon circle
   ═══════════════════════════════════════════ */
function TimelineNode({
  icon: Icon,
  accent,
  index,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  accent: string;
  index: number;
  active: boolean;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (active) {
      gsap.to(nodeRef.current, {
        scale: 1.18,
        duration: 0.4,
        ease: "back.out(1.7)",
      });
    } else {
      gsap.to(nodeRef.current, {
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, { dependencies: [active], scope: nodeRef });

  return (
    <div
      ref={nodeRef}
      className={`
        breathing-glow relative size-14 rounded-full flex items-center justify-center
        bg-gradient-to-br ${accent}
        ring-4 ring-background/80 backdrop-blur-xl
        z-20 transition-all duration-300
        ${active ? 'shadow-[0_0_25px_hsl(var(--primary)/0.7)]' : 'shadow-[0_0_12px_rgba(0,0,0,0.3)]'}
      `}
    >
      {/* Specular highlights */}
      <span className="pointer-events-none absolute inset-x-2 top-1 h-[2px] rounded-full bg-white/50 blur-[1px]" />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.4),transparent_60%)]" />
      <Icon className="size-6 text-white relative z-10 drop-shadow-md" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   TIMELINE CARD — Liquid glass with conic border & 3D tilt
   ═══════════════════════════════════════════ */
function TimelineCard({
  milestone,
  index,
  isLeft,
  active,
}: {
  milestone: Milestone;
  index: number;
  isLeft: boolean;
  active: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: cardRef });

  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;

    if (active) {
      gsap.to(card, {
        scale: 1.02,
        y: -4,
        duration: 0.5,
        ease: "power2.out",
      });
      if (borderRef.current) {
        gsap.to(borderRef.current, {
          opacity: 1,
          scale: 1.02,
          duration: 0.5,
        });
      }
    } else {
      gsap.to(card, {
        scale: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      });
      if (borderRef.current) {
        gsap.to(borderRef.current, {
          opacity: 0,
          scale: 1,
          duration: 0.5,
        });
      }
    }
  }, { dependencies: [active], scope: cardRef });

  // 3D tilt effect on mousemove
  const onMouseMove = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xNorm = (x / rect.width) - 0.5;
    const yNorm = (y / rect.height) - 0.5;

    const maxRotateX = 8;
    const maxRotateY = 8;

    gsap.to(card, {
      rotateY: xNorm * maxRotateY,
      rotateX: -yNorm * maxRotateX,
      transformPerspective: 1000,
      ease: "power2.out",
      duration: 0.3,
    });

    if (borderRef.current) {
      gsap.to(borderRef.current, {
        scale: 1.02,
        opacity: 1,
        duration: 0.3,
      });
    }
  });

  const onMouseLeave = contextSafe(() => {
    const card = cardRef.current;
    if (!card) return;

    gsap.to(card, {
      rotateY: 0,
      rotateX: 0,
      ease: "power2.out",
      duration: 0.5,
    });

    if (!active && borderRef.current) {
      gsap.to(borderRef.current, {
        scale: 1,
        opacity: 0,
        duration: 0.5,
      });
    }
  });

  return (
    <div
      ref={cardRef}
      className={`
        timeline-glass-card p-6 md:p-8 relative cursor-pointer border select-none
        transition-all duration-300 card-${index}
        ${active ? 'border-primary/50 shadow-[0_25px_70px_-20px_hsl(var(--primary)/0.35)]' : 'border-white/5 shadow-none'}
      `}
      style={{ opacity: 0 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Animated conic-gradient border */}
      <div ref={borderRef} className="timeline-border-accent opacity-0" />

      {/* Year badge with holographic shimmer */}
      <div className="flex items-center gap-3 mb-4">
        <span className="holographic-shimmer inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
          {milestone.year}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-display font-bold text-xl md:text-2xl text-foreground mb-3 tracking-tight">
        {milestone.title}
      </h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
        {milestone.description}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TITLE SPLIT REVEAL — Skew Bounce Letters
   ═══════════════════════════════════════════ */
const TitleReveal = ({ text, highlightText }: { text: string; highlightText: string }) => {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    const chars = containerRef.current.querySelectorAll(".char-reveal");
    gsap.fromTo(chars,
      { opacity: 0, y: 30, rotateX: -60, skewX: 10 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        skewX: 0,
        duration: 0.8,
        stagger: 0.02,
        ease: "back.out(1.5)",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          once: true
        }
      }
    );
  }, { scope: containerRef });

  return (
    <h2
      ref={containerRef}
      className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tight"
      style={{ perspective: "1000px" }}
    >
      {text.split("").map((char, i) => (
        <span key={i} className="char-reveal inline-block origin-bottom transform-gpu" style={{ transformStyle: "preserve-3d" }}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
      {" "}
      <span className="text-primary inline-block">
        {highlightText.split("").map((char, i) => (
          <span key={i} className="char-reveal inline-block origin-bottom transform-gpu" style={{ transformStyle: "preserve-3d" }}>
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
    </h2>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const AchievementsTimeline = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const railGlowRef = useRef<HTMLDivElement>(null);

  const [activeMilestone, setActiveMilestone] = useState(0);

  // Main GSAP Timeline setup
  useGSAP(() => {
    // Kill existing ScrollTriggers on re-run
    ScrollTrigger.getAll().forEach(st => {
      if (st.trigger === timelineRef.current) st.kill();
    });

    const tl = gsap.timeline();

    // Build timeline milestone sequence
    milestones.forEach((milestone, i) => {
      const isLeft = i % 2 === 0;
      const nodeSelector = `.node-container-${i}`;
      const cardSelector = `.card-${i}`;
      const segmentEndProgress = ((i + 1) / milestones.length);

      const stepLabel = `step-${i}`;
      tl.addLabel(stepLabel);

      // 1. Fill vertical rail
      tl.to([railFillRef.current, railGlowRef.current], {
        height: `${segmentEndProgress * 100}%`,
        duration: 1,
        ease: "none",
        onUpdate: function() {
          const currentProgress = this.progress();
          const activeIndex = Math.min(
            Math.floor(currentProgress * milestones.length),
            milestones.length - 1
          );
          setActiveMilestone(activeIndex);
        }
      }, stepLabel);

      // 2. Expand and glow milestone node
      tl.fromTo(nodeSelector,
        { scale: 0, opacity: 0 },
        { 
          scale: 1, 
          opacity: 1, 
          ease: "back.out(1.5)"
        },
        `${stepLabel}+=0.3`
      );

      // 3. Card slides in from sides with slight rotation
      tl.fromTo(cardSelector,
        {
          opacity: 0,
          x: isLeft ? -80 : 80,
          rotate: isLeft ? -4 : 4,
          scale: 0.95,
        },
        {
          opacity: 1,
          x: 0,
          rotate: 0,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        `${stepLabel}+=0.5`
      );
    });

    ScrollTrigger.create({
      animation: tl,
      trigger: timelineRef.current,
      start: "top 60%",
      end: "bottom 80%",
      scrub: 1.2,
      invalidateOnRefresh: true,
    });
  }, { scope: timelineRef, revertOnUpdate: true });

  return (
    <section
      id="achievements"
      ref={sectionRef}
      className="section-padding relative overflow-hidden"
    >
      {/* ── Dreaming background: aurora blobs ── */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="dreaming-aurora dreaming-aurora--1" style={{ top: "10%", right: "-5%" }} />
        <div className="dreaming-aurora dreaming-aurora--2" style={{ bottom: "15%", left: "5%" }} />
        <div className="dreaming-aurora dreaming-aurora--3" style={{ top: "50%", left: "40%" }} />
      </div>

      {/* ── Dreaming particles (GSAP) ── */}
      <DreamingParticles />

      <div className="container-custom">
        {/* ── Section Header ── */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-6 backdrop-blur-md">
            Our Journey
          </span>
          <TitleReveal text="Milestones &" highlightText="Achievements" />
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg font-light">
            From a small group of curious students to a nationally recognized
            innovation hub.
          </p>
        </div>



        {/* ── Timeline ── */}
        <div ref={timelineRef} className="relative py-10">
          {/* Background Rail Track */}
          <div
            aria-hidden
            className="absolute top-0 bottom-0 w-1 rounded-full left-[28px] md:left-1/2 md:-translate-x-px bg-border/30 backdrop-blur-sm shadow-inner"
          />

          {/* Animated Liquid Fill Rail (managed by GSAP timeline) */}
          <div
            ref={railFillRef}
            aria-hidden
            className="absolute top-0 w-1 rounded-full z-10 left-[28px] md:left-1/2 md:-translate-x-px bg-gradient-to-b from-primary via-accent to-secondary shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
            style={{ height: "0%" }}
          />

          {/* Glow halo behind fill (managed by GSAP timeline) */}
          <div
            ref={railGlowRef}
            aria-hidden
            className="absolute top-0 w-5 rounded-full opacity-50 z-0 left-[22px] md:left-1/2 md:-translate-x-[10px] bg-gradient-to-b from-primary via-accent to-secondary"
            style={{ height: "0%" }}
          />

          {/* Timeline Items */}
          <div className="relative z-20 space-y-12 md:space-y-20">
            {milestones.map((milestone, i) => {
              const isLeft = i % 2 === 0;
              const isActive = activeMilestone === i;
              return (
                <div
                  key={milestone.id}
                  className={`relative flex w-full items-start md:items-center ${
                    isLeft ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Node Container */}
                  <div className={`absolute flex items-center justify-center top-0 md:top-1/2 md:-translate-y-1/2 left-[2px] md:left-1/2 md:-translate-x-1/2 node-container-${i}`} style={{ opacity: 0 }}>
                    <TimelineNode
                      icon={milestone.icon}
                      accent={milestone.accent}
                      index={i}
                      active={isActive}
                    />
                  </div>

                  {/* Content Panel */}
                  <div
                    className={`w-full md:w-5/12 pl-20 md:pl-0 ${
                      isLeft ? "md:pr-14" : "md:pl-14"
                    }`}
                  >
                    <TimelineCard
                      milestone={milestone}
                      index={i}
                      isLeft={isLeft}
                      active={isActive}
                    />
                  </div>

                  {/* Empty space for alternating balance */}
                  <div className="hidden md:block md:w-5/12" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AchievementsTimeline;
