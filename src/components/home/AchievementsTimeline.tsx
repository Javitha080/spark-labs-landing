import { useRef, useEffect, type ComponentType } from "react";
import { motion, useScroll, useSpring, useTransform, useInView } from "framer-motion";
import { Trophy, Rocket, Zap, Award, Users, Globe } from "lucide-react";
import { animate } from "animejs";

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
   DREAMING PARTICLES — anime.js driven
   Max 8 particles per AGENTS.md rules
   ═══════════════════════════════════════════ */
function DreamingParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create 8 particle elements
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 8; i++) {
      const el = document.createElement("div");
      el.className = "dreaming-particle";
      el.style.left = `${10 + Math.random() * 80}%`;
      el.style.top = `${5 + Math.random() * 90}%`;
      el.style.width = `${3 + Math.random() * 4}px`;
      el.style.height = el.style.width;
      el.style.opacity = "0";
      container.appendChild(el);
      particles.push(el);
    }

    // Animate each with organic drift via anime.js v4
    const anims = particles.map((el, i) => {
      return animate(el, {
        translateX: [
          { to: `${-30 + Math.random() * 60}px`, duration: 3000 + i * 500 },
          { to: `${-20 + Math.random() * 40}px`, duration: 4000 + i * 300 },
          { to: "0px", duration: 3000 + i * 400 },
        ],
        translateY: [
          { to: `${-40 + Math.random() * 80}px`, duration: 4000 + i * 600 },
          { to: `${-20 + Math.random() * 40}px`, duration: 3000 + i * 400 },
          { to: "0px", duration: 3500 + i * 300 },
        ],
        opacity: [
          { to: 0.4 + Math.random() * 0.3, duration: 2000 },
          { to: 0.1, duration: 3000 },
          { to: 0.5, duration: 2500 },
        ],
        scale: [
          { to: 1.2 + Math.random() * 0.5, duration: 3000 },
          { to: 0.8, duration: 2500 },
          { to: 1, duration: 2000 },
        ],
        loop: true,
        ease: "inOutSine",
        delay: i * 400,
      });
    });

    return () => {
      anims.forEach((a) => { try { a.pause(); } catch { /* ignore */ } });
      particles.forEach((el) => el.remove());
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0" />;
}

/* ═══════════════════════════════════════════
   TIMELINE NODE — Glowing icon circle
   ═══════════════════════════════════════════ */
function TimelineNode({
  icon: Icon,
  accent,
  index,
}: {
  icon: ComponentType<{ className?: string }>;
  accent: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * 0.08 + 0.15,
      }}
      className="relative z-20"
    >
      <div
        className={`
          breathing-glow relative w-14 h-14 rounded-full flex items-center justify-center
          bg-gradient-to-br ${accent}
          ring-4 ring-background/80 backdrop-blur-xl
          shadow-[0_0_25px_rgba(0,0,0,0.2)]
        `}
      >
        {/* Specular highlights */}
        <span className="pointer-events-none absolute inset-x-2 top-1 h-[2px] rounded-full bg-white/50 blur-[1px]" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.4),transparent_60%)]" />
        <Icon className="w-6 h-6 text-white relative z-10 drop-shadow-md" />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   TIMELINE CARD — Liquid glass with conic border
   ═══════════════════════════════════════════ */
function TimelineCard({
  milestone,
  index,
  isLeft,
}: {
  milestone: Milestone;
  index: number;
  isLeft: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // anime.js scroll-triggered entrance
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(el, {
              opacity: [0, 1],
              translateY: [50, 0],
              scale: [0.92, 1],
              rotate: [isLeft ? -2 : 2, 0],
              duration: 900,
              ease: "outExpo",
              delay: index * 80,
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "-50px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index, isLeft]);

  return (
    <div
      ref={cardRef}
      className="timeline-glass-card p-6 md:p-8"
      style={{ opacity: 0 }}
    >
      {/* Animated conic-gradient border */}
      <div className="timeline-border-accent" />

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
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const AchievementsTimeline = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.05 });

  // Scroll-linked rail fill
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start center", "end center"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const fillHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

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

      {/* ── Dreaming particles (anime.js) ── */}
      {isInView && <DreamingParticles />}

      <div className="container-custom">
        {/* ── Section Header ── */}
        <motion.div
          className="text-center mb-16 md:mb-24"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-6 backdrop-blur-md">
            Our Journey
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tight">
            Milestones &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
              Achievements
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg font-light">
            From a small group of curious students to a nationally recognized
            innovation hub.
          </p>
        </motion.div>

        {/* ── Timeline ── */}
        <div ref={timelineRef} className="relative py-10">
          {/* Background Rail Track */}
          <div
            aria-hidden
            className="absolute top-0 bottom-0 w-1 rounded-full left-[28px] md:left-1/2 md:-translate-x-px bg-border/30 backdrop-blur-sm shadow-inner"
          />

          {/* Animated Liquid Fill Rail */}
          <motion.div
            aria-hidden
            style={{ height: fillHeight }}
            className="absolute top-0 w-1 rounded-full z-10 left-[28px] md:left-1/2 md:-translate-x-px bg-gradient-to-b from-primary via-accent to-secondary shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
          />

          {/* Glow halo behind fill */}
          <motion.div
            aria-hidden
            style={{ height: fillHeight }}
            className="absolute top-0 w-5 rounded-full opacity-50 z-0 left-[22px] md:left-1/2 md:-translate-x-[10px] bg-gradient-to-b from-primary via-accent to-secondary"
            // intentionally no blur animation — static blur applied via CSS filter
          />

          {/* Timeline Items */}
          <div className="relative z-20 space-y-12 md:space-y-20">
            {milestones.map((milestone, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div
                  key={milestone.id}
                  className={`relative flex w-full items-start md:items-center ${
                    isLeft ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Node Container */}
                  <div className="absolute flex items-center justify-center top-0 md:top-1/2 md:-translate-y-1/2 left-[2px] md:left-1/2 md:-translate-x-1/2">
                    <TimelineNode
                      icon={milestone.icon}
                      accent={milestone.accent}
                      index={i}
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
