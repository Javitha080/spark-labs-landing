import { Microscope, Users, Target } from "lucide-react";

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
    }
  ];

  return (
    <section id="about" className="section-padding bg-muted/30">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            About <span className="gradient-text">Our Club</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A community dedicated to fostering innovation and excellence in STEM education
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card p-8 rounded-2xl hover:scale-105 transition-transform duration-300 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 glass-card p-8 md:p-12 rounded-2xl text-center animate-fade-up">
          <h3 className="text-3xl font-bold mb-4 gradient-text">Our Mission</h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            To cultivate a generation of innovative thinkers and problem-solvers who are equipped with the skills, knowledge, 
            and confidence to tackle real-world challenges through hands-on STEM education, fostering creativity, collaboration, 
            and a passion for lifelong learning.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
