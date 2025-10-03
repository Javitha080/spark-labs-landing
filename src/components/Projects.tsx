import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import solarImage from "@/assets/project-solar.jpg";
import roboticsImage from "@/assets/project-robotics.jpg";
import ecoImage from "@/assets/project-eco.jpg";

const Projects = () => {
  const projects = [
    {
      title: "Solar-Powered Innovation",
      description: "Our students engineered solar-powered devices to tackle local energy challenges, showcasing sustainable innovation",
      image: solarImage,
      tags: ["#RenewableEnergy", "#Sustainability", "#Innovation"],
      gradient: "from-accent to-accent-glow"
    },
    {
      title: "Environmental Conservation",
      description: "They pioneered eco-friendly solutions for waste management and conservation, making a tangible impact on our community",
      image: ecoImage,
      tags: ["#EcoFriendly", "#WasteManagement", "#Community"],
      gradient: "from-secondary to-secondary-glow"
    },
    {
      title: "Advanced Robotics",
      description: "Our budding engineers constructed sophisticated robots, demonstrating core principles of engineering and programming",
      image: roboticsImage,
      tags: ["#Robotics", "#Engineering", "#Programming"],
      gradient: "from-primary to-primary-glow"
    }
  ];

  return (
    <section id="projects" className="section-padding bg-muted/30">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Innovation <span className="gradient-text">Projects</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Showcasing student creativity and engineering excellence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className="glass-card rounded-2xl overflow-hidden group hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${project.gradient} opacity-40 group-hover:opacity-30 transition-opacity`} />
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Button variant="ghost" className="group/btn w-full">
                  View Project Details
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
