import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import { Terminal, Shield, Cpu, Zap, FolderDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/ui/OptimizedImage";
import LiquidGlass from "@/components/ui/LiquidGlass";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string | null;
  image_url: string | null;
}

// Creative mock fallback leaders with funny biographies
const fallbackLeaders: TeamMember[] = [
  {
    id: "lead-1",
    name: "Javitha Senon",
    role: "President & Chief Maker",
    description: "Lead roboticist and coordinator. Can automate his bedroom curtains but accidentally locks himself out of his room twice a week.",
    image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300"
  },
  {
    id: "lead-2",
    name: "Shaleesha Hansamal",
    role: "Vice President & IoT Architect",
    description: "Firmly believes that everything, including brewing coffee, can be solved by an Arduino. Once built a robot to pet his cat, but the cat preferred the cardboard box it came in.",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=300"
  },
  {
    id: "lead-3",
    name: "Sahan Nevinda",
    role: "Technical Director",
    description: "Writes React code in his sleep. His keyboard has no backspace because he believes in absolute commitment. Rumored to survive entirely on caffeine.",
    image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300&h=300"
  },
  {
    id: "lead-4",
    name: "Umira",
    role: "Secretary & Tech Evangelist",
    description: "Keeps the makers from setting the lab on fire. Coordinates all events with absolute precision, but loses her phone while holding it in her hand.",
    image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=300"
  }
];

export default function LandingLeadership() {
  const [leaders, setLeaders] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchLeaders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("team_members_public")
        .select("id, name, role, description, image_url")
        .order("display_order", { ascending: true })
        .limit(4);

      if (error || !data || data.length === 0) {
        setLeaders(fallbackLeaders);
      } else {
        // Pad with mock if fewer than 4 members in database
        const loaded: TeamMember[] = data.map(d => ({
          id: d.id,
          name: d.name,
          role: d.role,
          description: d.description,
          image_url: d.image_url
        }));
        while (loaded.length < 4) {
          loaded.push(fallbackLeaders[loaded.length]);
        }
        setLeaders(loaded);
      }
    } catch {
      setLeaders(fallbackLeaders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaders();
  }, [fetchLeaders]);

  const handleCardClick = (id: string) => {
    setFlippedCard(flippedCard === id ? null : id);
  };

  const getBentoClass = (index: number) => {
    switch (index) {
      case 0:
        return "md:col-span-2 md:row-span-1";
      case 1:
        return "md:col-span-1 md:row-span-2";
      case 2:
        return "md:col-span-1 md:row-span-1";
      case 3:
        return "md:col-span-2 md:row-span-1";
      default:
        return "";
    }
  };

  const getLeaderIcon = (index: number) => {
    const classStr = "size-6 text-primary mb-3 opacity-80 group-hover:scale-110 transition-transform duration-300";
    switch (index) {
      case 0: return <Terminal className={classStr} />;
      case 1: return <Cpu className={classStr} />;
      case 2: return <Zap className={classStr} />;
      default: return <Shield className={classStr} />;
    }
  };

  return (
    <section id="team" className="section-padding relative overflow-hidden bg-background">
      {/* Background gradients */}
      <div className="absolute top-0 right-1/4 size-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-1/4 size-96 bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div className="text-center mb-16">
          <m.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl md:text-6xl font-black capitalize mb-4 tracking-tighter text-foreground"
          >
            our <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">leadership</span>
          </m.h2>
          <m.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium"
          >
            meet the chaotic minds driving our STEM, robotics, and design initiatives. Click a card to unlock their database files!
          </m.p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {leaders.map((leader, index) => {
              const isFlipped = flippedCard === leader.id;
              return (
                <div
                  key={leader.id}
                  className={`perspective-1000 w-full min-h-[220px] md:min-h-[260px] cursor-pointer group ${getBentoClass(index)}`}
                  onClick={() => handleCardClick(leader.id)}
                >
                  <m.div
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    className="size-full relative transform-style-3d preserve-3d"
                  >
                    {/* Card Front (Name & Role Only) */}
                    <LiquidGlass variant="button" rounded="3xl" className="absolute inset-0 backface-hidden bg-white/5 border border-white/10 hover:border-primary/40 p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-sm overflow-hidden select-none">
                      {/* Grid background effect */}
                      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                      <div className="absolute -top-10 -right-10 size-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
                      
                      <div className="relative z-10">
                        {getLeaderIcon(index)}
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground lowercase mb-1 group-hover:text-primary transition-colors">
                          {leader.name.toLowerCase()}
                        </h3>
                        <p className="text-xs uppercase tracking-widest font-extrabold text-muted-foreground/80">
                          {leader.role}
                        </p>
                      </div>

                      <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground mt-4">
                        <span className="flex items-center gap-1">
                          <FolderDot className="size-3.5 text-primary" />
                          click to open bio
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-primary">
                          sys.db //
                        </span>
                      </div>
                    </LiquidGlass>

                    {/* Card Back (Funny Bio & Photo) */}
                    <LiquidGlass variant="button" rounded="3xl" className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-white/[0.07] border border-primary/20 p-6 flex flex-col sm:flex-row gap-4 items-center justify-center shadow-2xl overflow-hidden select-none">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                      
                      {/* Circular Avatar */}
                      <div className="size-20 md:size-24 shrink-0 rounded-full overflow-hidden border-2 border-primary/40 shadow-lg relative z-10 bg-muted">
                        <OptimizedImage
                          src={leader.image_url || "/placeholder-avatar.jpg"}
                          alt={leader.name}
                          className="size-full object-cover"
                        />
                      </div>

                      {/* Bio Details */}
                      <div className="relative z-10 flex-1 text-center sm:text-left flex flex-col justify-center min-w-0">
                        <h4 className="text-lg font-bold text-foreground truncate">{leader.name}</h4>
                        <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2 block">{leader.role}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                          {leader.description || "Bio encrypt failure. Seek details in active macOS database."}
                        </p>
                      </div>
                    </LiquidGlass>
                  </m.div>
                </div>
              );
            })}
          </div>
        )}

        {/* macOS Workspace Route Button */}
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center mt-14"
        >
          <Button
            onClick={() => navigate("/leadership")}
            className="group relative rounded-2xl bg-white/5 border border-white/20 hover:border-primary/40 px-8 py-7 text-sm font-bold uppercase tracking-[0.2em] shadow-xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden hover:scale-105 active:scale-98"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <span className="relative z-10 flex items-center gap-3">
              <FolderDot className="size-4 group-hover:animate-bounce" />
              Launch macOS Team Workspace
            </span>
          </Button>
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium mt-3">
            highly interactive desktop environment powered by spark OS
          </span>
        </m.div>
      </div>
    </section>
  );
}
