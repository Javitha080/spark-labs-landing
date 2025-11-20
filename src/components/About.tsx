import { Microscope, Users, Target, Rocket, Award, Lightbulb } from "lucide-react";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const About = () => {
  const features = [
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
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />

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

        {/* Bento Grid Layout */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12"
        >
          {features.map((feature, index) => {
            // Bento grid pattern: make certain cards larger
            const isFeatured = index === 0 || index === 3;
            const isWide = index === 1;
            const isTall = index === 2;

            return (
              <div
                key={index}
                className={`
                  glass-card rounded-2xl overflow-hidden group relative
                  transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl
                  ${isFeatured ? 'md:col-span-2 md:row-span-2 p-8 md:p-10' : ''}
                  ${isWide ? 'md:col-span-2 p-6' : ''}
                  ${isTall ? 'md:row-span-2 p-6' : ''}
                  ${!isFeatured && !isWide && !isTall ? 'p-6' : ''}
                  ${gridVisible ? 'animate-fade-up' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className="relative z-10">
                  <div className={`
                    ${isFeatured ? 'w-16 h-16 md:w-20 md:h-20' : 'w-14 h-14'}
                    rounded-xl bg-gradient-to-br ${feature.gradient} 
                    flex items-center justify-center mb-4 md:mb-6
                    group-hover:scale-110 transition-transform duration-300
                    shadow-lg
                  `}>
                    <feature.icon className={`${isFeatured ? 'w-8 h-8 md:w-10 md:h-10' : 'w-7 h-7'} text-white`} />
                  </div>

                  <h3 className={`
                    ${isFeatured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}
                    font-bold mb-3 md:mb-4 group-hover:text-primary transition-colors
                  `}>
                    {feature.title}
                  </h3>

                  <p className={`
                    text-muted-foreground leading-relaxed
                    ${isFeatured ? 'text-base md:text-lg' : 'text-sm md:text-base'}
                  `}>
                    {feature.description}
                  </p>
                </div>

                {/* Corner decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>

        {/* Mission Statement */}
        <div ref={missionRef} className={`glass-card p-8 md:p-12 rounded-2xl text-center relative overflow-hidden ${missionVisible ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
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

          {/* Decorative orbs */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-2xl" />
        </div>
      </div>
    </section>
  );
};

export default About;
