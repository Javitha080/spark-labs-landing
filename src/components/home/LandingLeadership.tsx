import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { Terminal, Shield, Cpu, Zap, FolderDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/ui/OptimizedImage";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string | null;
  image_url: string | null;
}

const getBentoClass = (index: number) => {
  const pattern = index % 6;
  switch (pattern) {
    case 0: return "sm:col-span-2 md:col-span-2";
    case 1: return "sm:col-span-1 sm:row-span-2 md:col-span-1 md:row-span-2";
    case 2: return "sm:col-span-1 md:col-span-1";
    case 3: return "sm:col-span-1 md:col-span-1";
    case 4: return "sm:col-span-2 md:col-span-2";
    case 5: return "sm:col-span-2 md:col-span-1";
    default: return "";
  }
};

const getLeaderIcon = (index: number) => {
  const classStr = "size-5 md:size-6 text-primary mb-3 opacity-80 group-hover:scale-110 transition-transform duration-300";
  switch (index) {
    case 0: return <Terminal className={classStr} />;
    case 1: return <Cpu className={classStr} />;
    case 2: return <Zap className={classStr} />;
    default: return <Shield className={classStr} />;
  }
};

const FlipCard = ({ leader, index, isFlipped, onClick }: { leader: TeamMember, index: number, isFlipped: boolean, onClick: () => void }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateY: isFlipped ? 180 : 0,
      duration: 0.6,
      ease: "power2.inOut"
    });
  }, [isFlipped]);

  return (
    <div
      className={`perspective-1000 w-full min-h-[260px] sm:min-h-[240px] md:min-h-[280px] cursor-pointer group ${getBentoClass(index)}`}
      onClick={onClick}
    >
      <div
        ref={cardRef}
        className="size-full relative transform-style-3d preserve-3d"
      >
        {/* Card Front (Name & Role Only) */}
        <LiquidGlass variant="button" rounded="3xl" className="absolute inset-0 backface-hidden bg-white/5 border border-white/10 hover:border-primary/40 p-5 sm:p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-sm overflow-hidden select-none">
          {/* Grid background effect */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="absolute -top-10 -right-10 size-24 md:size-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
          
          <div className="relative z-10">
            {getLeaderIcon(index)}
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground lowercase mb-1 group-hover:text-primary transition-colors">
              {leader.name.toLowerCase()}
            </h3>
            <p className="text-xs sm:text-sm uppercase tracking-widest font-extrabold text-muted-foreground/80">
              {leader.role}
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm text-muted-foreground mt-4">
            <span className="flex items-center gap-1.5">
              <FolderDot className="size-4 text-primary" />
              click to open bio
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-primary">
              sys.db //
            </span>
          </div>
        </LiquidGlass>

        {/* Card Back (Funny Bio & Photo) */}
        <LiquidGlass variant="button" rounded="3xl" className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-white/[0.07] border border-primary/20 p-5 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center shadow-2xl overflow-hidden select-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          
          {/* Circular Avatar */}
          <div className="size-16 sm:size-20 md:size-24 shrink-0 rounded-full overflow-hidden border-2 border-primary/40 shadow-lg relative z-10 bg-muted">
            <OptimizedImage
              src={leader.image_url || "/placeholder-avatar.jpg"}
              alt={leader.name}
              className="size-full object-cover"
            />
          </div>

          {/* Bio Details */}
          <div className="relative z-10 flex-1 text-center sm:text-left flex flex-col justify-center min-w-0">
            <h4 className="text-lg sm:text-xl font-bold text-foreground truncate">{leader.name}</h4>
            <span className="text-xs sm:text-sm uppercase font-bold text-primary tracking-wider mb-1.5 sm:mb-2 block">{leader.role}</span>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-4">
              {leader.description || "Bio encrypt failure. Seek details in active macOS database."}
            </p>
          </div>
        </LiquidGlass>
      </div>
    </div>
  );
};

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

      if (error || !data) {
        setLeaders([]);
      } else {
        setLeaders(data);
      }
    } catch {
      setLeaders([]);
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

  return (
    <section id="team" className="section-padding relative overflow-hidden bg-background">
      {/* Background gradients */}
      <div className="absolute top-0 right-1/4 size-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-1/4 size-96 bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div className="text-center mb-10 sm:mb-16">
          <m.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black capitalize mb-3 sm:mb-4 tracking-tighter text-foreground px-4"
          >
            our <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">leadership</span>
          </m.h2>
          <m.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-medium px-4"
          >
            meet the chaotic minds driving our STEM, robotics, and design initiatives. Click a card to unlock their database files!
          </m.p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Responsive Bento Grid (Mobile, Tablet, Desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto grid-flow-row-dense px-4 sm:px-0">
              {leaders.map((leader, index) => (
                <FlipCard
                  key={leader.id}
                  leader={leader}
                  index={index}
                  isFlipped={flippedCard === leader.id}
                  onClick={() => handleCardClick(leader.id)}
                />
              ))}
            </div>
          </>
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
            className="group relative rounded-2xl bg-white/5 border border-white/20 hover:border-primary/40 px-5 sm:px-8 py-6 sm:py-7 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] shadow-xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden hover:scale-105 active:scale-98 w-[calc(100%-2rem)] sm:w-auto mx-auto"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
              <FolderDot className="size-4 group-hover:animate-bounce" />
              See More Members
            </span>
          </Button>
        </m.div>
      </div>
    </section>
  );
}
