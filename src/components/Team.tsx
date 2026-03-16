import { Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string | null;
  image_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  display_order: number;
}

const Team = () => {
  const [leaders, setLeaders] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  const fetchTeamMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('team_members_public')
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
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  useRealtimeSync(["team_members"], { onUpdate: fetchTeamMembers });

  const LeaderCard = ({ leader, index }: { leader: TeamMember; index: number }) => {
    const { ref, isVisible } = useScrollAnimation({
      threshold: 0.2,
      triggerOnce: true,
    });

    return (
      <div
        ref={ref}
        className={`
          glass-card p-8 md:p-10 rounded-3xl group relative overflow-hidden
          transition-all duration-700 hover:scale-[1.02] hover:shadow-2xl
          ${isVisible ? 'animate-fade-up' : 'opacity-0'}
        `}
        style={{ animationDelay: `${index * 150}ms` }}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Organic shape decoration */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-secondary/20 blob-shape opacity-50" />

        <div className="flex flex-col items-center text-center relative z-10">
          {/* Avatar with organic blob shape */}
          <div className="relative mb-6 group-hover:scale-105 transition-transform duration-500">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity blob-shape" />

            {leader.image_url && (
              <div className="relative">
                {/* Blob-shaped container */}
                <div className="w-36 h-36 md:w-40 md:h-40 blob-shape overflow-hidden ring-4 ring-background shadow-2xl relative">
                  <img
                    src={leader.image_url}
                    alt={`${leader.name} - ${leader.role}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Animated border */}
                <div className="absolute inset-0 blob-shape ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all" />
              </div>
            )}
          </div>

          {/* Role badge with gradient */}
          <div className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground text-[10px] uppercase tracking-widest font-bold mb-4 shadow-lg">
            {leader.role.toUpperCase()}
          </div>

          {/* Name with gradient on hover */}
          <h3 className="text-3xl md:text-4xl font-black lowercase mb-3 transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary group-hover:bg-clip-text group-hover:text-transparent">
            {leader.name.toLowerCase()}
          </h3>

          <p className="text-muted-foreground mb-6 leading-relaxed max-w-md">
            {leader.description}
          </p>

          {/* Action buttons with modern styling */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {leader.email && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 group/btn flex-1 border-2 hover:border-primary hover:bg-primary/10 rounded-xl transition-all"
                onClick={() => (window.location.href = `mailto:${leader.email}`)}
              >
                <Mail className="w-4 h-4 group-hover/btn:animate-bounce" />
                Email
              </Button>
            )}
            {leader.linkedin_url && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 group/btn flex-1 border-2 hover:border-secondary hover:bg-secondary/10 rounded-xl transition-all"
                onClick={() => window.open(leader.linkedin_url, '_blank')}
              >
                <Linkedin className="w-4 h-4 group-hover/btn:animate-pulse" />
                LinkedIn
              </Button>
            )}
          </div>
        </div>

        {/* Corner decoration */}
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/10 to-transparent rounded-tr-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  return (
    <section id="team" className="section-padding relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-5xl md:text-7xl font-black lowercase mb-4 tracking-tighter">
              our <GradientTextReveal gradient="from-primary via-secondary to-accent">leadership</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
              meet the dedicated leaders driving innovation and excellence
            </p>
          </TextReveal>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16"><Loading /></div>
        ) : leaders.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="glass-card p-8 rounded-2xl text-center max-w-md">
              <p className="text-muted-foreground">No team members to display</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {leaders.map((leader, index) => (
              <LeaderCard key={leader.id ?? index} leader={leader} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Team;
