import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface Partner {
  name: string;
  initials: string;
  color: string;
}

const partners: Partner[] = [
  { name: "Dharmapala Vidyalaya", initials: "DV", color: "from-blue-600 to-indigo-600" },
  { name: "Ministry of Education", initials: "MOE", color: "from-emerald-600 to-teal-600" },
  { name: "STEM Foundation SL", initials: "SF", color: "from-purple-600 to-violet-600" },
  { name: "TechBridge Lanka", initials: "TBL", color: "from-rose-600 to-pink-600" },
  { name: "National Science Council", initials: "NSC", color: "from-amber-600 to-orange-600" },
  { name: "Arduino Community SL", initials: "AC", color: "from-cyan-600 to-sky-600" },
  { name: "Google for Education", initials: "GfE", color: "from-red-500 to-yellow-500" },
  { name: "Robotics Society", initials: "RS", color: "from-fuchsia-600 to-pink-600" },
];

const PartnerLogo = ({ partner }: { partner: Partner }) => (
  <div className="group flex flex-col items-center gap-3 px-6 sm:px-8 shrink-0">
    <div
      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${partner.color} flex items-center justify-center shadow-lg grayscale group-hover:grayscale-0 opacity-50 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl`}
    >
      <span className="text-white font-bold text-sm sm:text-base font-mono tracking-tight">
        {partner.initials}
      </span>
    </div>
    <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 group-hover:text-muted-foreground transition-colors text-center max-w-[100px] leading-tight">
      {partner.name}
    </span>
  </div>
);

const Partners = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  // Double the partners for seamless loop
  const doubled = [...partners, ...partners];

  return (
    <section
      id="partners"
      ref={sectionRef}
      className="py-16 md:py-24 relative overflow-hidden border-y border-border/30"
    >
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
            Trusted by & Partnered with
          </span>
        </motion.div>
      </div>

      {/* Infinite scrolling marquee */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex animate-marquee-smooth hover:[animation-play-state:paused]">
            {doubled.map((partner, i) => (
              <PartnerLogo key={`${partner.name}-${i}`} partner={partner} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Partners;
