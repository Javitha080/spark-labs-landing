import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-innovation.jpg";
import { useParallax } from "@/hooks/useScrollAnimation";

const Hero = () => {
  const offsetY = useParallax();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background Image with Parallax */}
      <div 
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${offsetY * 0.5}px)` }}
      >
        <img
          src={heroImage}
          alt="Innovation and Technology"
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Content */}
      <div className="container-custom relative z-10 text-center section-padding">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 bg-background/80 backdrop-blur-sm mb-8 animate-scale-in">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-base font-semibold tracking-wide text-foreground">Welcome to Innovation</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold mb-8 text-foreground tracking-tight">
            Young Innovators <span className="text-primary">Club</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            Empowering the next generation of innovators through hands-on projects,
            collaborative learning, and cutting-edge technology exploration.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="btn-glow group text-lg px-8 py-6"
              onClick={() => scrollToSection("join")}
            >
              Join Our Community
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-2"
              onClick={() => scrollToSection("projects")}
            >
              Explore Projects
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto">
          {[
            { value: "500+", label: "Active Members" },
            { value: "50+", label: "Projects Completed" },
            { value: "20+", label: "Innovation Awards" },
            { value: "10+", label: "Industry Partners" },
          ].map((stat, index) => (
            <div 
              key={index} 
              className="border border-border/50 bg-card/50 backdrop-blur-sm p-8 rounded-2xl animate-fade-in hover:border-primary/50 transition-colors"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-4xl font-bold text-primary mb-3">{stat.value}</div>
              <div className="text-sm text-foreground font-medium tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/30 rounded-full p-1">
          <div className="w-1.5 h-1.5 bg-primary rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
