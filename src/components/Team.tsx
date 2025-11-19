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
    <section id="team" className="section-padding bg-background" ref={ref as any}>
      <div className="container-custom">
        <div className={`text-center mb-16 animate-on-scroll ${isVisible ? 'visible' : ''}`}>
          <h2 className="condensed-text text-5xl md:text-7xl lg:text-8xl mb-6">
            <span className="block text-foreground">OUR</span>
            <span className="block text-brutalist-primary">LEADERSHIP</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-bold">
            Meet the dedicated leaders driving innovation
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading team members...</div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children ${isVisible ? 'visible' : ''}`}>
            {leaders.map((leader) => (
              <div key={leader.id} className="border-brutalist p-0 hover:bg-primary/5 transition-all group">
                {leader.image_url && (
                  <img
                    src={leader.image_url}
                    alt={leader.name}
                    className="w-full aspect-square object-cover grayscale group-hover:grayscale-0 transition-all"
                  />
                )}
                
                <div className="p-6 bg-foreground text-background">
                  <div className="text-xs font-bold mb-2 text-primary uppercase">
                    {leader.role}
                  </div>
                  <h3 className="condensed-text text-2xl mb-3">
                    {leader.name.toUpperCase()}
                  </h3>
                  <p className="text-sm mb-4">{leader.description}</p>
                  
                  <div className="flex gap-3">
                    {leader.email && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-background text-background hover:bg-background hover:text-foreground"
                        onClick={() => window.location.href = `mailto:${leader.email}`}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    )}
                    {leader.linkedin_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-background text-background hover:bg-background hover:text-foreground"
                        onClick={() => window.open(leader.linkedin_url, '_blank')}
                      >
                        <Linkedin className="w-4 h-4" />
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
