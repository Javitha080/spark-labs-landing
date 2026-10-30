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
import LogoLoop from "@/components/reactbits/LogoLoop";
import Reveal from "@/components/animation/Reveal";
import { getLenis } from "@/lib/scroll";
import type { CSSProperties } from "react";

interface Partner {
    name: string;
    icon: React.ElementType;
    imageUrl?: string;
    href?: string;
}

const getStorageUrl = (path: string) => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
    return `${baseUrl}/storage/v1/object/public/gallery/uploads/${path}`;
};

const partners: Partner[] = [
    // NOTE: partnership list is unverified. Entries without imageUrl render a
    // generic Lucide fallback icon. Confirm each org before adding logos/links.
    {
        name: "Dharmapala Vidyalaya",
        icon: GraduationCap,
        imageUrl: getStorageUrl("Dharmapala_Crest_2png_sg3q8w1b_1778855867827.png")
    },
    {
        name: "Ministry of Education",
        icon: Building2,
        imageUrl: getStorageUrl("Emblem_of_Sri_Lankasvg_qd7pt6mc_1778854083285.png")
    },
    {
        name: "STEM Foundation SL",
        icon: Microscope
    },
    {
        name: "TechBridge Lanka",
        icon: Cpu
    },
    {
        name: "National Science Council",
        icon: Atom
    },
    {
        name: "Arduino Community SL",
        icon: CircuitBoard,
        imageUrl: getStorageUrl("Arduino_Logosvg_in5fkzjo_1778854115541.png")
    },
    {
        name: "Google for Education",
        icon: BookOpen,
        imageUrl: getStorageUrl("Google_for_Education_logosvg_z2c1u1or_1778854057310.png")
    },
    {
        name: "Robotics Society",
        icon: Bot,
        imageUrl: getStorageUrl("club-logo_b4ktsmgh_1778856038261.png")
    },
];

const partnerTile = (partner: Partner) => {
    const Icon = partner.icon;
    const tile = (
        <div className="group flex flex-col items-center justify-center gap-3 w-28 sm:w-32 select-none">
            <div className="relative size-20 sm:size-24 rounded-2xl border border-foreground/5 bg-foreground/[0.03] flex items-center justify-center overflow-hidden transition-colors duration-500 group-hover:border-primary/20">
                {partner.imageUrl ? (
                    <img
                        src={partner.imageUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="size-14 sm:size-16 object-contain grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    />
                ) : (
                    <Icon className="size-9 sm:size-10 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                )}
            </div>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.18em] font-bold text-muted-foreground/80 text-center leading-tight max-w-[130px]">
                {partner.name}
            </span>
        </div>
    );

    if (!partner.href) return tile;
    const href = partner.href;
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
                // External anchors skip Lenis's single-instance check; the
                // click never scrolls, so nothing to bridge here beyond
                // letting native behavior run.
                if (href.startsWith("#")) {
                    event.preventDefault();
                    getLenis()?.scrollTo("#" + href.slice(1));
                }
            }}
        >
            {tile}
        </a>
    );
};

const Partners = () => {
    return (
        <section
            id="partners"
            className="py-24 md:py-28 relative overflow-hidden bg-background"
        >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" aria-hidden="true" />

            <div className="container-custom">
                <Reveal direction="vertical" distance={20} trigger="scroll" once className="text-center mb-14" >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black lowercase tracking-tighter mb-4">
                        partners & <span className="text-primary">people we build with</span>
                    </h2>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                        Collaborating with leading institutions and organizations to shape the future of technology education in Sri Lanka.
                    </p>
                </Reveal>
            </div>

            <Reveal trigger="scroll" once initialOpacity={0} distance={0} aria-hidden="false" style={{ width: "100%", maxWidth: "none" } as CSSProperties}>
                <LogoLoop
                    logos={partners.map((partner) => ({
                        node: partnerTile(partner),
                        title: partner.name,
                        ariaLabel: partner.name,
                    }))}
                    speed={72}
                    logoHeight={110}
                    gap={96}
                    pauseOnHover
                    hoverSpeed={18}
                    scaleOnHover
                    fadeOut
                    fadeOutWidth={260}
                    fadeOutColor="hsl(var(--background))"
                    ariaLabel="Partner organizations of the Young Innovators Club"
                    style={{ width: "100%" } as CSSProperties}
                />
            </Reveal>
        </section>
    );
};

export default Partners;
