import { Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import javithaImage from "@/assets/team-javitha.jpg";
import shaleeshaImage from "@/assets/team-shaleesha.jpg";

const Team = () => {
  const leaders = [
    {
      name: "Javitha",
      role: "Chief Innovator",
      description: "Leads the club with a vision for future-forward projects and is dedicated to fostering a culture of high-level engineering and design excellence",
      image: javithaImage,
      gradient: "from-primary to-primary-glow",
      email: "javitha@innovators.club",
      linkedin: "#"
    },
    {
      name: "Shaleesha",
      role: "Operations Manager",
      description: "Manages club operations and logistics, ensuring smooth execution of all workshops and events, and supports team collaboration",
      image: shaleeshaImage,
      gradient: "from-secondary to-secondary-glow",
      email: "shaleesha@innovators.club",
      linkedin: "#"
    }
  ];

  return (
    <section id="team" className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Our <span className="gradient-text">Leadership</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Meet the dedicated leaders driving innovation and excellence
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {leaders.map((leader, index) => (
            <div
              key={index}
              className="glass-card p-8 rounded-2xl hover:scale-105 transition-all duration-300 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`relative mb-6 group-hover:scale-105 transition-transform`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${leader.gradient} rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                  <img
                    src={leader.image}
                    alt={`${leader.name} - ${leader.role}`}
                    className="relative w-32 h-32 rounded-full object-cover ring-4 ring-background"
                  />
                </div>

                <div className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${leader.gradient} text-white text-sm font-medium mb-3`}>
                  {leader.role}
                </div>

                <h3 className="text-2xl font-bold mb-3">{leader.name}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {leader.description}
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;
