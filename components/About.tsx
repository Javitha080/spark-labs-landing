import { Microscope, Users, Target, Rocket, Award, Lightbulb } from "lucide-react";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const About = () => {
  const features = [
    {
      icon: Users,
      title: "Expert Mentorship",
      description: "Direct guidance from industry professionals and alumni to shape career paths.",
      gradient: "from-primary to-accent"
    },
    {
      icon: Rocket,
      title: "Future Ready",
      description: "Equipping students with the adaptability and resilience needed for the evolving tech landscape.",
      gradient: "from-secondary to-primary"
    },
    {
      icon: Microscope,
      title: "Immersive Project-Based Learning",
      description: "We ignite curiosity and foster creative problem-solving skills through immersive, project-based learning experiences.",
      gradient: "from-primary to-primary-glow"
    },
    {
      icon: Users,
      title: "Collaborative Innovation",
      description: "Students thrive in a supportive environment, working in teams to develop solutions and build essential communication skills.",
      gradient: "from-secondary to-secondary-glow"
    },
    {
      icon: Target,
      title: "High Standards & Success",
      description: "We uphold high standards, ensuring students are well-prepared for academic achievements and future professional success.",
      gradient: "from-accent to-accent-glow"
    },
    {
      icon: Rocket,
      title: "Innovation First",
      description: "Breaking barriers with cutting-edge technology and forward-thinking approaches to problem-solving.",
      gradient: "from-primary via-secondary to-accent"
    },
    {
      icon: Award,
      title: "Recognition & Achievements",
      description: "Celebrating excellence through competitions, exhibitions, and industry recognition programs.",
      gradient: "from-secondary via-accent to-primary"
    },
    {
      icon: Lightbulb,
      title: "Creative Thinking",
      description: "Nurturing imagination and out-of-the-box thinking to create tomorrow's groundbreaking solutions.",
      gradient: "from-accent via-primary to-secondary"
    }
  ];

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: missionRef, isVisible: missionVisible } = useScrollAnimation();

  return (
    <section id="about" className="section-padding bg-muted/30 relative overflow-hidden">
      {/* Background decoration - Enhanced with organic blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 blob-shape" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10 blob-shape" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              About <GradientTextReveal gradient="from-primary via-secondary to-accent">Our Club</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A community dedicated to fostering innovation and excellence in STEM education
            </p>
          </TextReveal>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {features.map((feature, index) => {
            // Modern Bento Layout Pattern (Gap-free 4x3 grid with 8 items)
            // Row 1: [Item 0 (1)] [Item 1 (1)] [Item 2 (2x2 starts)]
            // Row 2: [Item 3 (1x2 starts)] [Item 4 (1)] [Item 2 (2x2 ends)]
            // Row 3: [Item 3 (1x2 ends)] [Item 5 (1)] [Item 6 (1)] [Item 7 (1)]

            let bentoClass = "";
            if (index === 2) bentoClass = "md:col-span-2 md:row-span-2";
            else if (index === 3) bentoClass = "md:row-span-2";

            const isHighlighted = index === 2;

            return (
              <div
                key={index}
                className={`
                  group relative overflow-hidden rounded-[2rem] bg-card border border-border/50 
                  hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10
                  ${bentoClass}
                  ${gridVisible ? 'animate-fade-up' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

                <div className={`
                  absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${feature.gradient} 
                  opacity-10 blur-[80px] rounded-full transform translate-x-1/2 -translate-y-1/2 
                  group-hover:opacity-20 transition-opacity duration-500
                `} />

                {/* Background Illustration Icon */}
                <feature.icon
                  className={`
                    absolute -bottom-4 -right-4 w-32 h-32 md:w-48 md:h-48 text-foreground/5 
                    transform -rotate-12 
                    pointer-events-none z-0
                  `}
                  strokeWidth={0.5}
                />

                <div className="relative z-10 p-8 flex flex-col h-full bg-gradient-to-br from-background/50 to-transparent">
                  <div className={`
                    w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} 
                    flex items-center justify-center mb-6 shadow-lg shadow-primary/20
                    group-hover:scale-110 group-hover:rotate-3 transition-all duration-500
                  `}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>

                  <div className="mt-auto">
                    <h3 className={`
                      font-bold mb-3 group-hover:text-primary transition-colors duration-300
                      ${isHighlighted ? 'text-2xl md:text-3xl' : 'text-xl'}
                    `}>
                      {feature.title}
                    </h3>

                    <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mission Statement - Enhanced with organic design */}
        <div ref={missionRef} className={`bento-card-organic p-8 md:p-12 text-center relative ${missionVisible ? 'animate-fade-up' : 'opacity-0'}`}>
          {/* Animated blobs */}
          <div className="bento-blob absolute bg-primary/20 w-40 h-40 -top-10 -left-10" />
          <div className="bento-blob absolute bg-secondary/20 w-40 h-40 -bottom-10 -right-10" style={{ animationDelay: '-2s' }} />

          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-2xl" />

          <div className="relative z-10">
            <h3 className="text-3xl font-bold mb-4">
              <GradientTextReveal gradient="from-primary via-secondary to-accent">
                Our Mission
              </GradientTextReveal>
            </h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              To cultivate a generation of innovative thinkers and problem-solvers who are equipped with the skills, knowledge,
              and confidence to tackle real-world challenges through hands-on STEM education, fostering creativity, collaboration,
              and a passion for lifelong learning.
            </p>
          </div>

          {/* Particle overlay */}
          <div className="particle-overlay" />
        </div>
      </div>
    </section>
  );
};

export default About;
