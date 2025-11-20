import { useState, useEffect } from "react";
import { ArrowRight, Lightbulb, Rocket, Users, Award, ChevronDown, Zap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-innovation.jpg";

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
      {/* Background with Enhanced Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
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

          {/* Main Headline - Mobile Optimized */}
          <h1 className="font-display font-bold mb-4 md:mb-6 animate-fade-up">
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2 md:mb-3 leading-tight tracking-tighter">
              <span className="inline-block transition-all duration-500">
                {words[currentWord]}.
              </span>
            </span>
            <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              The Future.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg lg:text-xl text-foreground/80 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-up px-4" style={{ animationDelay: "100ms" }}>
            Where young minds build tomorrow through STEM innovation, creative problem-solving, and collaborative learning
          </p>

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

      {/* Scroll Indicator */}
      <button 
        onClick={() => scrollToSection("about")}
        className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 animate-bounce-slow z-10 group"
        aria-label="Scroll to next section"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-10 border-2 border-foreground/30 rounded-full flex items-start justify-center p-2 group-hover:border-primary transition-colors">
            <div className="w-1 h-2 bg-foreground/50 rounded-full group-hover:bg-primary transition-colors" />
          </div>
          <ChevronDown className="w-5 h-5 text-foreground/30 group-hover:text-primary transition-colors" />
        </div>
      </button>
    </section>
  );
};

export default Hero;
