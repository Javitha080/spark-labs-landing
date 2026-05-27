import { useRef } from "react";
import { m, useInView } from "framer-motion";
import {
  GraduationCap,
  Building2,
  Microscope,
  Cpu,
  Atom,
  CircuitBoard,
  BookOpen,
  Bot
} from "lucide-react";

interface Partner {
  name: string;
  icon: React.ElementType;
  color: string;
  imageUrl?: string;
}

const partners: Partner[] = [
  {
    name: "Dharmapala Vidyalaya",
    icon: GraduationCap,
    color: "from-blue-600 to-indigo-600",
    imageUrl: "https://gtwqjuisdmbqlsjlatyj.supabase.co/storage/v1/object/public/gallery/uploads/Dharmapala_Crest_2png_sg3q8w1b_1778855867827.png"
  },
  {
    name: "Ministry of Education",
    icon: Building2,
    color: "from-emerald-600 to-teal-600",
    imageUrl: "https://gtwqjuisdmbqlsjlatyj.supabase.co/storage/v1/object/public/gallery/uploads/Emblem_of_Sri_Lankasvg_qd7pt6mc_1778854083285.png"
  },
  {
    name: "STEM Foundation SL",
    icon: Microscope,
    color: "from-purple-600 to-violet-600"
  },
  {
    name: "TechBridge Lanka",
    icon: Cpu,
    color: "from-rose-600 to-pink-600"
  },
  {
    name: "National Science Council",
    icon: Atom,
    color: "from-amber-600 to-orange-600"
  },
  {
    name: "Arduino Community SL",
    icon: CircuitBoard,
    color: "from-cyan-600 to-sky-600",
    imageUrl: "https://gtwqjuisdmbqlsjlatyj.supabase.co/storage/v1/object/public/gallery/uploads/Arduino_Logosvg_in5fkzjo_1778854115541.png"
  },
  {
    name: "Google for Education",
    icon: BookOpen,
    color: "from-red-500 to-yellow-500",
    imageUrl: "https://gtwqjuisdmbqlsjlatyj.supabase.co/storage/v1/object/public/gallery/uploads/Google_for_Education_logosvg_z2c1u1or_1778854057310.png"
  },
  {
    name: "Robotics Society",
    icon: Bot,
    color: "from-fuchsia-600 to-pink-600",
    imageUrl: "https://gtwqjuisdmbqlsjlatyj.supabase.co/storage/v1/object/public/gallery/uploads/club-logo_b4ktsmgh_1778856038261.png"
  },
];

const PartnerLogo = ({ partner }: { partner: Partner }) => {
  const Icon = partner.icon;
  return (
    <div className="group flex flex-col items-center gap-4 px-8 sm:px-12 shrink-0 cursor-default">
      <div className="relative size-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 z-10">
        {/* Ambient Glow */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${partner.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl`} />

        {/* Glass Container */}
        <div className="absolute inset-0 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-2xl transition-all duration-500 group-hover:border-white/10 group-hover:bg-white/10 overflow-hidden flex items-center justify-center" />

        {/* Icon or Image */}
        <div className="relative z-10 size-12 sm:w-14 sm:h-14 flex items-center justify-center drop-shadow-md transition-transform duration-500 group-hover:scale-110">
          {partner.imageUrl ? (
            <img
              src={partner.imageUrl}
              alt={`${partner.name} logo`}
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              className="size-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 drop-shadow-md opacity-80 group-hover:opacity-100"
            />
          ) : (
            <Icon className="size-10 sm:w-12 sm:h-12 text-muted-foreground group-hover:text-white transition-colors duration-500" />
          )}
        </div>

        {/* Shimmer Effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out opacity-0 group-hover:opacity-100" />
        </div>
      </div>
      <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground/40 group-hover:text-foreground transition-colors duration-500 text-center max-w-[120px] leading-tight">
        {partner.name}
      </span>
    </div>
  );
};

const Partners = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  // Double the partners for seamless loop (-50% translation)
  const doubled = [...partners, ...partners];

  return (
    <section
      id="partners"
      ref={sectionRef}
      className="py-20 md:py-32 relative overflow-hidden bg-background"
    >
      {/* Decorative top/bottom borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="container mx-auto px-4">
        <m.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            Our Ecosystem
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight mb-4">
            Trusted by & Partnered with
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Collaborating with leading institutions and organizations to shape the future of technology education in Sri Lanka.
          </p>
        </m.div>
      </div>

      {/* Infinite scrolling marquee */}
      <div className="relative group/marquee">
        {/* Heavy Fade edges for seamless looping illusion */}
        <div className="absolute left-0 top-0 bottom-0 w-32 md:w-64 bg-gradient-to-r from-background via-background/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 md:w-64 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none" />

        <m.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex overflow-hidden"
        >
          <div className="flex w-max animate-marquee-smooth group-hover/marquee:[animation-play-state:paused]">
            {doubled.map((partner, i) => (
              <PartnerLogo key={`${partner.name}-${i}`} partner={partner} />
            ))}
          </div>
        </m.div>
      </div>
    </section>
  );
};

export default Partners;
