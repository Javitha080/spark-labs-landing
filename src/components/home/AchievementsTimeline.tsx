import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Trophy, Rocket, Zap, Award, Users, Globe } from "lucide-react";

interface Milestone {
  year: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const milestones: Milestone[] = [
  {
    year: "2020",
    title: "Club Founded",
    description:
      "Young Innovators Club established at Dharmapala Vidyalaya with 7 founding members and a vision for student-led STEM innovation.",
    icon: Rocket,
    color: "from-violet-500 to-purple-600",
  },
  {
    year: "2021",
    title: "First Robotics Project",
    description:
      "Completed our first autonomous robot and entered the National Robotics Challenge, earning a special mention from judges.",
    icon: Zap,
    color: "from-cyan-500 to-blue-600",
  },
  {
    year: "2022",
    title: "Solar Energy Lab",
    description:
      "Built and installed a solar energy monitoring station, teaching students renewable energy concepts through hands-on data collection.",
    icon: Globe,
    color: "from-emerald-500 to-teal-600",
  },
  {
    year: "2023",
    title: "National Competition Win",
    description:
      "Won first place at the National STEM Innovation Fair with our IoT-based Smart Classroom project, beating 50+ school teams.",
    icon: Trophy,
    color: "from-amber-500 to-orange-600",
  },
  {
    year: "2024",
    title: "Community Expansion",
    description:
      "Grew to 30+ active members, launched online STEM courses, and began mentoring students from neighbouring schools.",
    icon: Users,
    color: "from-pink-500 to-rose-600",
  },
  {
    year: "2025",
    title: "International Recognition",
    description:
      "Featured in Asian Education Summit. Launched a coding bootcamp, 3D printing lab, and our digital learning platform.",
    icon: Award,
    color: "from-indigo-500 to-violet-600",
  },
];

const TimelineItem = ({
  milestone,
  index,
}: {
  milestone: Milestone;
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isLeft = index % 2 === 0;

  return (
    <div
      ref={ref}
      className={`relative flex items-center w-full ${isLeft ? "md:flex-row" : "md:flex-row-reverse"} flex-row`}
    >
      {/* Content card */}
      <motion.div
        className={`w-full md:w-5/12 ${isLeft ? "md:pr-8" : "md:pl-8"} pl-12 md:pl-0`}
        initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="group relative">
          {/* Card glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

          <div className="relative glass-card rounded-2xl border border-border/50 p-6 backdrop-blur-md bg-background/60 hover:border-primary/30 transition-all duration-300">
            <span className="font-mono text-xs font-bold text-primary/70 uppercase tracking-widest">
              {milestone.year}
            </span>
            <h3 className="font-display font-bold text-lg mt-1 mb-2 text-foreground">
              {milestone.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {milestone.description}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Center dot — visible on all screen sizes */}
      <motion.div
        className="absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
      >
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${milestone.color} flex items-center justify-center shadow-lg`}
        >
          <milestone.icon className="w-5 h-5 text-white" />
        </div>
      </motion.div>

      {/* Spacer for opposite side */}
      <div className="hidden md:block md:w-5/12" />
    </div>
  );
};

const AchievementsTimeline = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.05 });

  return (
    <section
      id="achievements"
      ref={sectionRef}
      className="py-20 md:py-32 relative overflow-hidden"
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-6">
            Our Journey
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tight">
            Milestones &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Achievements
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg font-light">
            From a small group of curious students to a nationally recognized
            innovation hub.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <motion.div
            className="absolute left-5 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px"
            style={{
              background:
                "linear-gradient(180deg, transparent, hsl(var(--primary) / 0.3) 10%, hsl(var(--primary) / 0.3) 90%, transparent)",
            }}
            initial={{ scaleY: 0, originY: 0 }}
            animate={isInView ? { scaleY: 1 } : {}}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          <div className="space-y-12 md:space-y-16">
            {milestones.map((milestone, index) => (
              <TimelineItem
                key={milestone.year}
                milestone={milestone}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AchievementsTimeline;
