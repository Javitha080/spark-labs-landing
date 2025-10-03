import { ArrowRight, Lightbulb, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-innovation.jpg";

const Hero = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-secondary/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-accent/20 rounded-full blur-xl animate-float" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-secondary/20 rounded-full blur-xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-primary/20 rounded-full blur-xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Content */}
      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full">
            <Lightbulb className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-white">Dharmapala Vidyalaya, Pannipitiya</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white">
            Cultivating Young{" "}
            <span className="bg-gradient-to-r from-accent via-white to-secondary bg-clip-text text-transparent animate-gradient">
              Innovators
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Empowering the next generation through hands-on STEM education and creative problem-solving in a dynamic environment
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button onClick={() => scrollToSection("join")} variant="cta" size="xl" className="group">
              Join Our Club
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button onClick={() => scrollToSection("projects")} variant="glass" size="xl" className="text-white border-white/30">
              Explore Projects
              <Rocket className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="glass-card p-6 rounded-xl">
              <div className="text-3xl font-bold text-white mb-2">50+</div>
              <div className="text-white/80">Projects Completed</div>
            </div>
            <div className="glass-card p-6 rounded-xl">
              <div className="text-3xl font-bold text-white mb-2">100+</div>
              <div className="text-white/80">Active Members</div>
            </div>
            <div className="glass-card p-6 rounded-xl">
              <div className="text-3xl font-bold text-white mb-2">5+</div>
              <div className="text-white/80">Years of Innovation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-white/70 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
