import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Rocket, Users, Zap, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { m, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from "framer-motion";
import { logError } from "@/lib/errors";

/* ===========================================
   HERO SECTION - Premium Glassmorphism Design
   With particles, animations, and lighting effects
   =========================================== */

const words = ["Innovate", "Create", "Transform", "Build", "Design"];

// Floating particles with glow
const FloatingParticles = () => {
  const [particles] = useState(() =>
    [...Array(8)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <m.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: 'hsl(var(--primary))',
            boxShadow: `0 0 ${p.size * 4}px hsl(var(--primary) / 0.6)`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Magnetic button wrapper
const MagneticButton = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <m.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </m.div>
  );
};

// Glowing orb background
const GlowingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <m.div
      className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
      style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent)',
        top: '10%',
        right: '-10%',
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.2, 0.35, 0.2],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <m.div
      className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
      style={{
        background: 'radial-gradient(circle, hsl(var(--accent) / 0.4), transparent)',
        bottom: '0%',
        left: '5%',
      }}
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.15, 0.25, 0.15],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    />
  </div>
);

const Hero = () => {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [stats, setStats] = useState({ members: 100, projects: 50, awards: 15 });

  const { scrollY } = useScroll();
  const heroRef = useRef<HTMLElement>(null);

  // Parallax effects
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const scale = useTransform(scrollY, [0, 400], [1, 0.95]);

  // Typing effect
  useEffect(() => {
    const word = words[wordIndex];
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const type = () => {
      if (!isDeleting && charIndex <= word.length) {
        setText(word.slice(0, charIndex));
        charIndex++;
      } else if (isDeleting && charIndex >= 0) {
        setText(word.slice(0, charIndex));
        charIndex--;
      }

      if (charIndex === word.length + 1) {
        isDeleting = true;
        timeoutId = setTimeout(type, 2000);
        return;
      }

      if (charIndex === -1) {
        isDeleting = false;
        setWordIndex((prev) => (prev + 1) % words.length);
        return;
      }

      timeoutId = setTimeout(type, isDeleting ? 50 : 100);
    };

    type();

    return () => clearTimeout(timeoutId);
  }, [wordIndex]);

  // Fetch stats with graceful fallback
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const [membersResult, projectsResult] = await Promise.allSettled([
          supabase.from('team_members_public').select('*', { count: 'exact', head: true }),
          supabase.from('projects').select('*', { count: 'exact', head: true }),
        ]);

        if (!cancelled) {
          if (membersResult.status === 'fulfilled' && membersResult.value.count) {
            setStats(s => ({ ...s, members: membersResult.value.count }));
          }
          if (projectsResult.status === 'fulfilled' && projectsResult.value.count) {
            setStats(s => ({ ...s, projects: projectsResult.value.count }));
          }
        }
      } catch {
        // Silently fail — hardcoded fallbacks are already set
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Animated background */}
      <GlowingOrbs />
      <FloatingParticles />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Content */}
      <m.div
        style={{ y, opacity, scale }}
        className="relative z-10 container-custom text-center"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Animated Badge */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card">
              <m.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="size-4 text-primary" />
              </m.div>
              <span className="text-sm font-medium text-foreground">
                Empowering Young Innovators Since 2020
              </span>
              <Star className="size-3 text-primary fill-primary" />
            </div>
          </m.div>

          {/* Main Headline with glow */}
          <m.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
            className="text-[18vw] sm:text-[14vw] md:text-[12vw] lg:text-[10rem] xl:text-[12rem] font-display font-extrabold tracking-tighter leading-none"
          >
            <span className="text-foreground">Where Students</span>
            <br />
            <span
              className="text-primary relative"
              style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.4)' }}
            >
              {text}
              <m.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-primary"
              >
                |
              </m.span>
            </span>
          </m.h1>

          {/* Subtitle */}
          <m.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Join the Young Innovators Club at Dharmapala Vidyalaya.
            Build projects, learn skills, and shape the future through technology.
          </m.p>

          {/* CTA Buttons with magnetic effect */}
          <m.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <MagneticButton>
              <Button
                size="lg"
                onClick={() => scrollToSection("join")}
                className="btn-glow text-base px-8 py-6 rounded-full group"
              >
                <span className="relative z-10 flex items-center">
                  Join the Club
                  <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </MagneticButton>

            <MagneticButton>
              <Button
                variant="outline"
                size="lg"
                onClick={() => scrollToSection("projects")}
                className="glass-card text-base px-8 py-6 rounded-full border-primary/30 hover:border-primary/60 transition-colors"
              >
                View Projects
              </Button>
            </MagneticButton>
          </m.div>

          {/* Stats - Glass cards */}
          <m.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="pt-16"
          >
            <div className="inline-flex flex-wrap items-center justify-center gap-4 md:gap-6 p-6 rounded-2xl glass-card">
              {[
                { icon: Users, value: stats.members, label: "Members" },
                { icon: Rocket, value: stats.projects, label: "Projects" },
                { icon: Zap, value: stats.awards, label: "Awards" },
              ].map((stat, i) => (
                <m.div
                  key={i}
                  className="text-center px-6 py-2"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="size-5 text-primary" />
                    <span className="text-3xl md:text-4xl font-display font-bold text-foreground">
                      {stat.value}+
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </m.div>
              ))}
            </div>
          </m.div>
        </div>
      </m.div>

      {/* Scroll indicator - hidden initially, appears after delay, fades on scroll */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 0.8 }}
        style={{ opacity: useTransform(scrollY, [0, 100, 300], [1, 0.5, 0]) }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <button type="button"
          onClick={() => scrollToSection("about")}
          className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
        >
          <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
          <m.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-current flex items-start justify-center p-2 group-hover:border-primary transition-colors"
          >
            <m.div
              className="w-1 h-2 rounded-full bg-current"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </m.div>
        </button>
      </m.div>
    </section>
  );
};

export default Hero;
