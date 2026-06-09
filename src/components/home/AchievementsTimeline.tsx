import { useRef, useState, type ComponentType } from "react";
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
}

const milestones: Milestone[] = [
  {
    id: "2020",
    year: "2020",
    title: "Club Founded",
    description:
      "Young Innovators Club established at Dharmapala Vidyalaya with 7 founding members and a vision for student-led STEM innovation.",
    icon: Rocket,
  },
  {
    id: "2021",
    year: "2021",
    title: "First Robotics Project",
    description:
      "Completed our first autonomous robot and entered the National Robotics Challenge, earning a special mention from judges.",
    icon: Zap,
  },
  {
    id: "2022",
    year: "2022",
    title: "Solar Energy Lab",
    description:
      "Built and installed a solar energy monitoring station, teaching students renewable energy concepts through hands-on data collection.",
    icon: Globe,
  },
  {
    id: "2023",
    year: "2023",
    title: "National Competition Win",
    description:
      "Won first place at the National STEM Innovation Fair with our IoT-based Smart Classroom project, beating 50+ school teams.",
    icon: Trophy,
  },
  {
    id: "2024",
    year: "2024",
    title: "Community Expansion",
    description:
      "Grew to 30+ active members, launched online STEM courses, and began mentoring students from neighbouring schools.",
    icon: Users,
  },
  {
    id: "2025",
    year: "2025",
    title: "International Recognition",
    description:
      "Featured in Asian Education Summit. Launched a coding bootcamp, 3D printing lab, and our digital learning platform.",
    icon: Award,
  },
];

/* ═══════════════════════════════════════════
   TIMELINE NODE — Liquid glass frosted icon
   ═══════════════════════════════════════════ */
function TimelineNode({
  icon: Icon,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  index: number;
  active: boolean;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (active) {
      gsap.to(nodeRef.current, {
        scale: 1.1,
        duration: 0.4,
        ease: "power2.out",
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
        tl-liquid-node relative size-14 rounded-2xl flex items-center justify-center
        z-20 transition-shadow duration-300
        ${active ? 'tl-liquid-node--active' : ''}
      `}
    >
      <Icon className="size-6 text-foreground/80 relative z-10" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   TIMELINE CARD — Clean glass panel
   ═══════════════════════════════════════════ */
function TimelineCard({
  milestone,
  index,
  active,
}: {
  milestone: Milestone;
  index: number;
  isLeft: boolean;
  active: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: cardRef });

  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;

    if (active) {
      gsap.to(card, {
        y: -2,
        duration: 0.5,
        ease: "power2.out",
      });
    } else {
      gsap.to(card, {
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, { dependencies: [active], scope: cardRef });

  // Subtle tilt on hover
  const onMouseMove = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xNorm = (x / rect.width) - 0.5;
    const yNorm = (y / rect.height) - 0.5;

    gsap.to(card, {
      rotateY: xNorm * 4,
      rotateX: -yNorm * 4,
      transformPerspective: 1200,
      ease: "power2.out",
      duration: 0.3,
    });
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
  });

  return (
    <div
      ref={cardRef}
      className={`
        tl-clean-card p-6 md:p-8 relative cursor-pointer select-none
        transition-colors duration-300 card-${index}
        ${active ? 'tl-clean-card--active' : ''}
      `}
      style={{ opacity: 0 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Year badge — clean, monochrome */}
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] bg-foreground/5 text-foreground/60 border border-foreground/10">
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

      // 1. Fill vertical rail — simple height growth
      tl.to(railFillRef.current, {
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

      // 2. Node appears with a clean scale-in
      tl.fromTo(nodeSelector,
        { scale: 0, opacity: 0 },
        { 
          scale: 1, 
          opacity: 1, 
          ease: "back.out(1.5)"
        },
        `${stepLabel}+=0.3`
      );

      // 3. Card slides in
      tl.fromTo(cardSelector,
        {
          opacity: 0,
          x: isLeft ? -60 : 60,
          scale: 0.97,
        },
        {
          opacity: 1,
          x: 0,
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
      <div className="container-custom">
        {/* ── Section Header ── */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-foreground/5 text-foreground/50 border border-foreground/10 mb-6">
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
          {/* Background Rail — simple thin line */}
          <div
            aria-hidden
            className="tl-rail-bg absolute top-0 bottom-0 left-[28px] md:left-1/2 md:-translate-x-px"
          />

          {/* Animated Fill Rail — monochrome, managed by GSAP */}
          <div
            ref={railFillRef}
            aria-hidden
            className="tl-rail-fill absolute top-0 left-[28px] md:left-1/2 md:-translate-x-px z-10"
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
