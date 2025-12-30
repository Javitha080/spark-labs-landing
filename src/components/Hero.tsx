import { useState, useEffect } from "react";
import { ArrowRight, Lightbulb, Rocket, Users, Award, Zap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";

const Hero = () => {
  const [currentWord, setCurrentWord] = useState(0);
  const words = ["Innovate", "Create", "Transform", "Build", "Design"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with Enhanced Overlay - Static for Performance */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
      </div>

      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-1 h-1 bg-primary/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 md:px-6 relative z-10 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm mb-6 md:mb-8 animate-fade-in">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs md:text-sm font-medium">
              Innovation Club 2025 • Dharmapala Vidyalaya
            </span>
          </div>

          {/* Main Headline - Mobile Optimized with Text Reveal */}
          <TextReveal animation="fade-up">
            <h1 className="font-display font-bold mb-4 md:mb-6">
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2 md:mb-3 leading-tight tracking-tighter">
                <span className="inline-block transition-all duration-500">
                  {words[currentWord]}.
                </span>
              </span>
              <GradientTextReveal
                className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight"
                gradient="from-primary via-secondary to-accent"
              >
                The Future.
              </GradientTextReveal>
            </h1>
          </TextReveal>

          {/* Subheading */}
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-base md:text-lg lg:text-xl text-foreground/80 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
              Where young minds build tomorrow through STEM innovation, creative problem-solving, and collaborative learning
            </p>
          </TextReveal>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-12 md:mb-16 animate-fade-up px-4" style={{ animationDelay: "200ms" }}>
            <Button
              onClick={() => scrollToSection("join")}
              size="lg"
              className="btn-glow group w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-6 md:py-7"
            >
              Join Our Club
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              onClick={() => scrollToSection("projects")}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-6 md:py-7 border-2 hover:bg-primary/10"
            >
              Explore Projects
              <Rocket className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Stats - Mobile First Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-4xl mx-auto animate-fade-up px-4" style={{ animationDelay: "300ms" }}>
            <div className="stat-card group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 md:p-6 hover:border-primary/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-1 md:mb-2">50+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Projects</div>
              </div>
            </div>

            <div className="stat-card group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 md:p-6 hover:border-secondary/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-secondary" />
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary mb-1 md:mb-2">100+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Members</div>
              </div>
            </div>

            <div className="stat-card group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 md:p-6 hover:border-accent/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-accent mb-1 md:mb-2">15+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Awards</div>
              </div>
            </div>

            <div className="stat-card group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 md:p-6 hover:border-primary/50 transition-all col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-1 md:mb-2">5+</div>
                <div className="text-xs md:text-sm text-muted-foreground">Years Strong</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
