import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Brutalist Geometric Shapes - NOT organic */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 border-8 border-primary rotate-12" />
        <div className="absolute bottom-32 right-20 w-96 h-96 border-8 border-secondary -rotate-6" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-accent" />
        <div className="absolute top-1/4 right-1/4 w-32 h-32 border-8 border-accent rotate-45" />
      </div>
      
      <div className="container-custom relative z-10 py-32">
        {/* MASSIVE BRUTALIST TYPOGRAPHY */}
        <h1 className="brutalist-text leading-none mb-8">
          <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] text-outline mb-4">
            YOUNG
          </span>
          <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] text-brutalist-primary mb-4">
            INNOVATORS
          </span>
          <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] text-brutalist-light">
            CLUB
          </span>
        </h1>
        
        {/* Subtitle - HIGH CONTRAST */}
        <div className="brutalist-block max-w-3xl mb-12">
          <p className="text-xl md:text-2xl font-bold uppercase tracking-wide">
            Dharmapala Vidyalaya • STEM Innovation • 2025
          </p>
        </div>
        
        {/* Brutalist CTA */}
        <Button 
          onClick={() => scrollToSection("join")}
          className="border-brutalist bg-primary text-primary-foreground text-lg px-12 py-8 uppercase font-bold hover:bg-foreground hover:text-background transition-all"
          size="xl"
        >
          JOIN NOW <ArrowRight className="ml-2" />
        </Button>
      </div>
    </section>
  );
};

export default Hero;
