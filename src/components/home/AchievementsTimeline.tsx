import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Trophy, Rocket, Zap, Award, Users, Globe } from "lucide-react";
import Timeline, { type TimelineEntry } from "@/components/ui/Timeline";

const milestones: TimelineEntry[] = [
  {
    id: "2020",
    meta: "2020",
    title: "Club Founded",
    description:
      "Young Innovators Club established at Dharmapala Vidyalaya with 7 founding members and a vision for student-led STEM innovation.",
    icon: Rocket,
    accent: "from-violet-500 to-purple-600",
  },
  {
    id: "2021",
    meta: "2021",
    title: "First Robotics Project",
    description:
      "Completed our first autonomous robot and entered the National Robotics Challenge, earning a special mention from judges.",
    icon: Zap,
    accent: "from-cyan-500 to-blue-600",
  },
  {
    id: "2022",
    meta: "2022",
    title: "Solar Energy Lab",
    description:
      "Built and installed a solar energy monitoring station, teaching students renewable energy concepts through hands-on data collection.",
    icon: Globe,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    id: "2023",
    meta: "2023",
    title: "National Competition Win",
    description:
      "Won first place at the National STEM Innovation Fair with our IoT-based Smart Classroom project, beating 50+ school teams.",
    icon: Trophy,
    accent: "from-amber-500 to-orange-600",
  },
  {
    id: "2024",
    meta: "2024",
    title: "Community Expansion",
    description:
      "Grew to 30+ active members, launched online STEM courses, and began mentoring students from neighbouring schools.",
    icon: Users,
    accent: "from-pink-500 to-rose-600",
  },
  {
    id: "2025",
    meta: "2025",
    title: "International Recognition",
    description:
      "Featured in Asian Education Summit. Launched a coding bootcamp, 3D printing lab, and our digital learning platform.",
    icon: Award,
    accent: "from-indigo-500 to-violet-600",
  },
];

const AchievementsTimeline = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.05 });

  return (
    <section
      id="achievements"
      ref={sectionRef}
      className="section-padding relative overflow-hidden"
    >
      {/* Ambient blobs (static — no animated blur) */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="container-custom">
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

        <Timeline items={milestones} variant="rail" />
      </div>
    </section>
  );
};

export default AchievementsTimeline;
