import { Microscope, Users, Target } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const About = () => {
  const { ref, isVisible } = useScrollAnimation(0.1);

  const features = [
    {
      icon: Microscope,
      title: "Project-Based Learning",
      description: "We ignite curiosity and foster creative problem-solving skills through immersive, project-based learning experiences.",
    },
    {
      icon: Users,
      title: "Collaborative Innovation",
      description: "Students thrive in a supportive environment, working in teams to develop solutions and build essential communication skills.",
    },
    {
      icon: Target,
      title: "High Standards & Success",
      description: "We uphold high standards, ensuring students are well-prepared for academic achievements and future professional success.",
    }
  ];

  return (
    <section id="about" className="section-padding bg-background" ref={ref as any}>
      <div className="container-custom">
        <div className={`text-center mb-16 animate-on-scroll ${isVisible ? 'visible' : ''}`}>
          <h2 className="condensed-text text-5xl md:text-7xl lg:text-8xl mb-6">
            <span className="block text-foreground">ABOUT</span>
            <span className="block text-brutalist-primary">OUR CLUB</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-bold">
            A community dedicated to fostering innovation
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto stagger-children ${isVisible ? 'visible' : ''}`}>
          {/* Large Card - 8 cols */}
          <div className="md:col-span-8 p-8 border-brutalist bg-primary/5 hover:bg-primary/10 transition-all">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-20 h-20 bg-primary border-4 border-foreground flex items-center justify-center flex-shrink-0">
                <Microscope className="w-10 h-10 text-background" />
              </div>
              <div>
                <h3 className="condensed-text text-3xl mb-3">
                  PROJECT-BASED LEARNING
                </h3>
                <p className="text-lg text-muted-foreground">
                  Hands-on experiences that ignite curiosity and foster creative problem-solving
                </p>
              </div>
            </div>
          </div>
          
          {/* Small Card - 4 cols */}
          <div className="md:col-span-4 p-8 border-brutalist bg-secondary/5 hover:bg-secondary/10 transition-all">
            <div className="w-16 h-16 bg-secondary border-4 border-foreground flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-background" />
            </div>
            <h3 className="condensed-text text-2xl mb-3">
              COLLABORATION
            </h3>
            <p className="text-muted-foreground">
              Team innovation and skills
            </p>
          </div>

          {/* Medium Card - 5 cols */}
          <div className="md:col-span-5 p-8 border-brutalist bg-accent/5 hover:bg-accent/10 transition-all">
            <div className="w-16 h-16 bg-accent border-4 border-foreground flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-background" />
            </div>
            <h3 className="condensed-text text-2xl mb-3">
              HIGH STANDARDS
            </h3>
            <p className="text-muted-foreground">
              Excellence in education and achievements
            </p>
          </div>

          {/* Mission Statement - 7 cols */}
          <div className="md:col-span-7 brutalist-block">
            <h3 className="condensed-text text-3xl mb-4">OUR MISSION</h3>
            <p className="text-lg leading-relaxed">
              To cultivate a generation of innovative thinkers and problem-solvers who are equipped with the skills, knowledge, 
              and confidence to tackle real-world challenges through hands-on STEM education.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
