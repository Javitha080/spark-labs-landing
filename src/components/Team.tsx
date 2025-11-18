import { Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const Team = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .order('display_order', { ascending: true });

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

        {loading ? (
          <div className="text-center text-muted-foreground">Loading team members...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {leaders.map((leader, index) => (
              <div
                key={leader.id}
                className="glass-card p-10 rounded-2xl hover:scale-105 transition-all duration-300 group shadow-lg hover:shadow-xl relative overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background/5 to-secondary/5 backdrop-blur-[2px] -z-10"></div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6 group-hover:scale-105 transition-transform">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-glow rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    {leader.image_url && (
                      <img
                        src={leader.image_url}
                        alt={`${leader.name} - ${leader.role}`}
                        className="relative w-32 h-32 rounded-full object-cover ring-4 ring-background"
                      />
                    )}
                  </div>

                  <div className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-primary to-primary-glow text-white text-sm font-medium mb-3">
                    {leader.role}
                  </div>

                  <h3 className="text-2xl font-bold mb-3">{leader.name}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {leader.description}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {leader.email && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 group/btn"
                        onClick={() => window.location.href = `mailto:${leader.email}`}
                      >
                        <Mail className="w-4 h-4 group-hover/btn:animate-bounce" />
                        Email
                      </Button>
                    )}
                    {leader.linkedin_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 group/btn"
                        onClick={() => window.open(leader.linkedin_url, '_blank')}
                      >
                        <Linkedin className="w-4 h-4 group-hover/btn:animate-pulse" />
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
