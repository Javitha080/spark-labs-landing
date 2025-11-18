import { Lightbulb, Users, Rocket, Trophy, Target, Zap } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Lightbulb,
    title: "Innovation Focus",
    description: "Explore cutting-edge technologies and develop creative solutions to real-world problems.",
    size: "large"
  },
  {
    icon: Users,
    title: "Collaborative Learning",
    description: "Work together with passionate peers, sharing knowledge and building lasting connections.",
    size: "medium"
  },
  {
    icon: Rocket,
    title: "Hands-on Projects",
    description: "Gain practical experience through engaging projects that bring your ideas to life.",
    size: "medium"
  },
  {
    icon: Trophy,
    title: "Recognition",
    description: "Showcase your achievements and compete in innovation challenges and competitions.",
    size: "small"
  },
  {
    icon: Target,
    title: "Goal-Oriented",
    description: "Set ambitious targets and achieve them with structured guidance and mentorship.",
    size: "small"
  },
  {
    icon: Zap,
    title: "Fast-Paced",
    description: "Stay ahead with rapid prototyping and agile development methodologies.",
    size: "medium"
  }
];

const About = () => {
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section 
      id="about" 
      ref={ref}
      className="section-padding bg-background relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="container-custom relative z-10">
        <div 
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Our <span className="text-primary">Club</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            A community of young minds passionate about innovation, technology, and making a difference.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-20">
          {features.map((feature, index) => {
            const colSpan = feature.size === "large" ? "md:col-span-3" : feature.size === "medium" ? "md:col-span-2" : "md:col-span-2";
            const rowSpan = feature.size === "large" ? "md:row-span-2" : "md:row-span-1";
            
            return (
              <div 
                key={index}
                className={`${colSpan} ${rowSpan} border border-border/50 bg-card/30 backdrop-blur-sm p-8 rounded-3xl hover:border-primary/50 transition-all duration-500 group ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <feature.icon className="w-12 h-12 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-4 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Mission Statement */}
        <div 
          className={`border border-border/50 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm p-16 rounded-3xl text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "0.6s" }}
        >
          <h3 className="text-4xl font-bold mb-8 text-foreground">Our Mission</h3>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
            To inspire and empower young innovators to develop their skills, pursue their passions, 
            and create meaningful impact through technology and innovation. We believe in fostering 
            creativity, collaboration, and continuous learning in a supportive and inclusive environment.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
