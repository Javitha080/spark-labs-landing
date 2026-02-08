import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowRight, Rocket, Users, Zap, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { supabase } from "@/integrations/supabase/client";
import { motion, useScroll, useTransform } from "framer-motion";

const words = ["Innovate", "Create", "Transform", "Build", "Design"];

const Hero = () => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);
  const [stats, setStats] = useState({ members: 0, projects: 0, events: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  // Fetch real stats
  useEffect(() => {
    const fetchStats = async () => {
      const [enrollments, projects, events] = await Promise.all([
        supabase.from("enrollment_submissions").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        members: enrollments.count || 0,
        projects: projects.count || 0,
        events: events.count || 0,
      });
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % words.length;
      const fullText = words[i];
      setText(isDeleting ? fullText.substring(0, text.length - 1) : fullText.substring(0, text.length + 1));
      let typeSpeed = isDeleting ? 30 : Math.random() * 100 + 50;
      if (!isDeleting && text === fullText) { typeSpeed = 2000; setIsDeleting(true); }
      else if (isDeleting && text === "") { setIsDeleting(false); setLoopNum(loopNum + 1); typeSpeed = 500; }
      setTypingSpeed(typeSpeed);
    };
    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, typingSpeed]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // Animated counter
  const AnimatedCounter = ({ end, suffix = "" }: { end: number; suffix?: string }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true); }, { threshold: 0.5 });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!inView || end === 0) return;
      const duration = 2000;
      const steps = 60;
      const increment = end / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) { setCount(end); clearInterval(timer); }
        else setCount(Math.floor(current));
      }, duration / steps);
      return () => clearInterval(timer);
    }, [inView, end]);

    return <div ref={ref} className="text-3xl sm:text-4xl md:text-5xl font-black tabular-nums">{count}{suffix}</div>;
  };

  const particles = useMemo(() => [...Array(15)].map((_, i) => ({
    left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`, duration: `${10 + Math.random() * 10}s`,
    size: Math.random() * 4 + 1, opacity: Math.random() * 0.4 + 0.1
  })), []);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Mesh Gradient Background */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        <div className="absolute inset-0 bg-[conic-gradient(from_230deg_at_51%_52%,hsl(var(--primary)/0.2)_0deg,hsl(var(--secondary)/0.15)_67deg,hsl(var(--accent)/0.1)_198deg,hsl(var(--primary)/0.08)_251deg,hsl(var(--secondary)/0.2)_301deg,transparent_360deg)]" />
        <div className="absolute inset-0 bg-background/85 backdrop-blur-3xl" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p, i) => (
            <div key={i} className="absolute rounded-full bg-primary/20 blur-[1px]"
              style={{ left: p.left, top: p.top, width: `${p.size}px`, height: `${p.size}px`, opacity: p.opacity, animation: `float ${p.duration} ease-in-out infinite`, animationDelay: p.delay }} />
          ))}
        </div>
      </motion.div>

      <motion.div className="container mx-auto px-4 sm:px-6 relative z-10 pt-24 sm:pt-28 md:pt-32 pb-8" style={{ opacity: textOpacity, y: textY }}>
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-6 sm:mb-8 hover:border-primary/40 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-foreground/80">Innovation Club 2025</span>
            </motion.div>

            <TextReveal animation="fade-up">
              <h1 className="font-display font-bold mb-4 sm:mb-6">
                <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2 leading-none tracking-tight">
                  <span className="inline-block min-w-[160px] sm:min-w-[200px] text-foreground">
                    {text}<span className="animate-pulse text-primary">_</span>
                  </span>
                </span>
                <GradientTextReveal className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-none tracking-tight pb-2" gradient="from-primary via-secondary to-accent">
                  The Future.
                </GradientTextReveal>
              </h1>
            </TextReveal>

            <TextReveal animation="fade-up" delay={100}>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Connect with young minds to build tomorrow through STEM innovation, creative problem-solving, and collaborative learning.
              </p>
            </TextReveal>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Button onClick={() => scrollToSection("join")} size="lg"
                className="btn-glow group relative overflow-hidden rounded-full text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300">
                <span className="relative z-10 flex items-center">
                  Join The Club <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button onClick={() => scrollToSection("projects")} variant="outline" size="lg"
                className="rounded-full text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 border-2 hover:bg-secondary/5 transition-all duration-300">
                <span className="flex items-center">Our Projects <Rocket className="w-5 h-5 ml-2" /></span>
              </Button>
            </motion.div>
          </div>

          {/* 3D Perspective Card Stack */}
          <div className="flex-1 w-full max-w-md lg:max-w-lg relative hidden md:block" style={{ perspective: "1200px" }}>
            <motion.div initial={{ opacity: 0, rotateY: -15 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
              className="relative w-full aspect-square" style={{ transformStyle: "preserve-3d" }}>
              {/* Stacked cards with 3D perspective */}
              {[
                { icon: Users, label: "Community", value: `${stats.members}+ Members`, color: "from-primary/20 to-primary/5", delay: 0, rotate: "-6deg", translate: "-10px" },
                { icon: Sparkles, label: "Innovation", value: `${stats.projects}+ Projects`, color: "from-secondary/20 to-secondary/5", delay: 0.1, rotate: "3deg", translate: "20px" },
                { icon: Zap, label: "Events", value: `${stats.events}+ Events`, color: "from-accent/20 to-accent/5", delay: 0.2, rotate: "-2deg", translate: "50px" },
              ].map((card, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 40, rotateX: 20 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: 0.5 + card.delay, duration: 0.6, type: "spring" }}
                  className={`absolute left-1/2 -translate-x-1/2 w-[70%] p-5 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl hover:shadow-primary/20 transition-all duration-500 cursor-default group`}
                  style={{ top: `${15 + i * 30}%`, transform: `translateX(-50%) rotate(${card.rotate}) translateY(${card.translate})`, zIndex: 3 - i }}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.color} opacity-50 group-hover:opacity-80 transition-opacity`} />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-background/60 border border-border/30">
                      <card.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{card.label}</div>
                      <div className="text-xs text-muted-foreground">{card.value}</div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Center glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-gradient-to-br from-primary/15 to-secondary/15 rounded-full blur-3xl animate-pulse" />
            </motion.div>
          </div>
        </div>

        {/* Stats Counter Row */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 max-w-3xl mx-auto lg:mx-0">
          {[
            { end: stats.members, suffix: "+", label: "Members" },
            { end: stats.projects, suffix: "+", label: "Projects" },
            { end: stats.events, suffix: "+", label: "Events" },
          ].map((stat, i) => (
            <div key={i} className="text-center lg:text-left">
              <AnimatedCounter end={stat.end} suffix={stat.suffix} />
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll Down Indicator */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 cursor-pointer" onClick={() => scrollToSection("about")}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground/60 hover:text-primary transition-colors">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-medium">Scroll</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
