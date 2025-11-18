import { Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Team = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, isVisible } = useScrollAnimation(0.1);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .order('display_order', { ascending: true});

        if (error) throw error;
        setLeaders(data || []);
      } catch (error) {
        toast({
          title: "Error loading team members",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, []);

  return (
    <section id="team" ref={ref} className="section-padding bg-background">
      <div className="container-custom">
        <div 
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Our <span className="text-primary">Leadership</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            Meet the dedicated leaders driving innovation and excellence
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading team members...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {leaders.map((leader, index) => (
              <div
                key={leader.id}
                className={`border border-border/50 bg-card backdrop-blur-sm p-10 rounded-3xl group hover:border-primary/50 transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6 group-hover:scale-105 transition-transform">
                    {leader.image_url && (
                      <img
                        src={leader.image_url}
                        alt={`${leader.name} - ${leader.role}`}
                        className="relative w-32 h-32 rounded-full object-cover ring-4 ring-primary/20"
                      />
                    )}
                  </div>

                  <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                    {leader.role}
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-foreground">{leader.name}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {leader.description}
                  </p>

                  <div className="flex gap-3">
                    {leader.email && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => window.location.href = `mailto:${leader.email}`}
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </Button>
                    )}
                    {leader.linkedin_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => window.open(leader.linkedin_url, '_blank')}
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Team;
