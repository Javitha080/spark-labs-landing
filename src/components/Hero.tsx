import { useState, useEffect, useMemo } from "react";
import { ArrowRight, Lightbulb, Rocket, Users, Award, Zap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";

const words = ["Innovate", "Create", "Transform", "Build", "Design"];

const Hero = () => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);



  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % words.length;
      const fullText = words[i];

      setText(isDeleting
        ? fullText.substring(0, text.length - 1)
        : fullText.substring(0, text.length + 1)
      );

      // Randomize typing speed slightly for realism
      let typeSpeed = isDeleting ? 30 : 150;
      if (!isDeleting) {
        typeSpeed = Math.random() * (150 - 50) + 50;
      }
      setTypingSpeed(typeSpeed);

      if (!isDeleting && text === fullText) {
        setTypingSpeed(2000); // Pause at end of word
        setIsDeleting(true);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        setTypingSpeed(500); // Pause before next word
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, typingSpeed]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Memoize background particles for performance
  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${10 + Math.random() * 10}s`,
      size: Math.random() * 4 + 1,
      opacity: Math.random() * 0.5 + 0.1
    }));
  }, []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--secondary)/0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-background/90 backdrop-blur-3xl" />

        {/* Animated Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/20 blur-[1px]"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animation: `float ${p.duration} ease-in-out infinite`,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-8 animate-fade-in hover:border-primary/40 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-foreground/80">
                Innovation Club 2025
              </span>
            </div>

            <TextReveal animation="fade-up">
              <h1 className="font-display font-bold mb-6">
                <span className="block text-5xl sm:text-6xl md:text-7xl mb-2 leading-none tracking-tight">
                  <span className="inline-block min-w-[200px] text-foreground">
                    {text}
                    <span className="animate-pulse text-primary">_</span>
                  </span>
                </span>
                <GradientTextReveal
                  className="block text-5xl sm:text-6xl md:text-7xl leading-none tracking-tight pb-2"
                  gradient="from-primary via-secondary to-accent"
                >
                  The Future.
                </GradientTextReveal>
              </h1>
            </TextReveal>

            <TextReveal animation="fade-up" delay={100}>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Connect with young minds to build tomorrow through STEM innovation,
                creative problem-solving, and collaborative learning.
              </p>
            </TextReveal>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: "200ms" }}>
              <Button
                onClick={() => scrollToSection("join")}
                size="lg"
                className="btn-glow group relative overflow-hidden rounded-full text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
              >
                <span className="relative z-10 flex items-center">
                  Join The Club
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>

              <Button
                onClick={() => scrollToSection("projects")}
                variant="outline"
                size="lg"
                className="rounded-full text-lg px-8 py-6 border-2 hover:bg-secondary/5 transition-all duration-300"
              >
                <span className="flex items-center">
                  Our Projects
                  <Rocket className="w-5 h-5 ml-2 group-hover:-translate-y-1 transition-transform" />
                </span>
              </Button>
            </div>
          </div>

          {/* 3D Visual Element (CSS based) */}
          <div className="flex-1 w-full max-w-[500px] lg:max-w-none relative animate-fade-up hidden md:block" style={{ animationDelay: "400ms" }}>
            <div className="relative w-full aspect-square">
              {/* Abstract decorative circles */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-secondary/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl animate-pulse" />

              {/* Floating Cards */}
              <div className="absolute top-[20%] right-[10%] p-4 bg-card/80 backdrop-blur-md rounded-2xl border border-primary/10 shadow-xl animate-float" style={{ animationDelay: '0s' }}>
                <Users className="w-8 h-8 text-primary mb-2" />
                <div className="text-sm font-bold">Community</div>
                <div className="text-xs text-muted-foreground">100+ Members</div>
              </div>

              <div className="absolute bottom-[20%] left-[10%] p-4 bg-card/80 backdrop-blur-md rounded-2xl border border-secondary/10 shadow-xl animate-float" style={{ animationDelay: '2s' }}>
                <Zap className="w-8 h-8 text-secondary mb-2" />
                <div className="text-sm font-bold">Innovation</div>
                <div className="text-xs text-muted-foreground">50+ Projects</div>
              </div>

              <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-primary to-secondary p-1 rounded-full animate-float" style={{ animationDelay: '1s' }}>
                <div className="bg-background rounded-full p-6">
                  <Rocket className="w-12 h-12 text-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
