import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react";
import { motion, useInView, useScroll, useTransform, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Apple-inspired Liquid Glass Timeline.
 *
 * Reusable, performance-conscious vertical timeline:
 * - Compositor-safe animations (opacity + transform only).
 * - Glassmorphism panels with subtle specular highlight.
 * - Alternating layout on `md+`, single column on mobile.
 * - Works for marketing milestones, admin activity, blog journeys, etc.
 */

export interface TimelineEntry {
  id: string;
  /** Short label rendered above the title (e.g. "2024", "12 min ago") */
  meta?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Optional icon (lucide-react component or any RFC) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Tailwind gradient classes for the node (e.g. "from-violet-500 to-fuchsia-600") */
  accent?: string;
  /** Optional rich content rendered below description */
  children?: ReactNode;
}

interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  items: TimelineEntry[];
  /** Layout variant: alternating (marketing) or single-rail (admin/log) */
  variant?: "alternating" | "rail";
  /** Compact spacing for dense admin lists */
  compact?: boolean;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const nodeVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 220, damping: 18 },
  },
};

const TimelineNode = ({
  icon: Icon,
  accent = "from-primary to-accent",
}: {
  icon?: TimelineEntry["icon"];
  accent?: string;
}) => (
  <div
    className={cn(
      "relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
      "bg-gradient-to-br shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]",
      "ring-1 ring-white/20 backdrop-blur-xl",
      accent
    )}
  >
    {/* Specular highlight */}
    <span className="pointer-events-none absolute inset-x-2 top-1 h-[2px] rounded-full bg-white/50 blur-[1px]" />
    <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.35),transparent_60%)]" />
    {Icon ? <Icon className="w-5 h-5 text-white relative z-10 drop-shadow" /> : null}
  </div>
);

const GlassPanel = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-3xl p-5 md:p-6",
      "bg-background/40 backdrop-blur-2xl",
      "border border-white/10",
      "shadow-[0_20px_60px_-25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]",
      "transition-all duration-500 ease-out",
      "hover:border-primary/30 hover:shadow-[0_25px_70px_-20px_hsl(var(--primary)/0.35),inset_0_1px_0_rgba(255,255,255,0.12)]",
      "hover:-translate-y-0.5",
      className
    )}
  >
    {/* Top sheen */}
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
    />
    {/* Soft inner glow */}
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.10),transparent_55%)]"
    />
    <div className="relative">{children}</div>
  </div>
);

const AlternatingItem = ({ entry, index }: { entry: TimelineEntry; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const isLeft = index % 2 === 0;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full items-center",
        isLeft ? "md:flex-row" : "md:flex-row-reverse"
      )}
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={cardVariants}
        className={cn(
          "w-full md:w-5/12",
          isLeft ? "md:pr-10" : "md:pl-10",
          "pl-16 md:pl-0"
        )}
      >
        <GlassPanel>
          {entry.meta && (
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              {entry.meta}
            </div>
          )}
          <h3 className="mt-1.5 font-display font-bold text-lg md:text-xl text-foreground">
            {entry.title}
          </h3>
          {entry.description && (
            <p className="mt-2 text-sm md:text-[0.95rem] text-muted-foreground leading-relaxed">
              {entry.description}
            </p>
          )}
          {entry.children && <div className="mt-3">{entry.children}</div>}
        </GlassPanel>
      </motion.div>

      {/* Center node */}
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={nodeVariants}
        className="absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10"
      >
        <TimelineNode icon={entry.icon} accent={entry.accent} />
      </motion.div>

      <div className="hidden md:block md:w-5/12" />
    </div>
  );
};

const RailItem = ({ entry, compact }: { entry: TimelineEntry; compact?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <div ref={ref} className="relative flex gap-4 md:gap-5">
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={nodeVariants}
        className="relative z-10"
      >
        <TimelineNode icon={entry.icon} accent={entry.accent} />
      </motion.div>

      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={cardVariants}
        className="flex-1 min-w-0"
      >
        <GlassPanel className={compact ? "p-4" : undefined}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h4 className="font-display font-bold text-base md:text-lg text-foreground truncate">
              {entry.title}
            </h4>
            {entry.meta && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                {entry.meta}
              </span>
            )}
          </div>
          {entry.description && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {entry.description}
            </p>
          )}
          {entry.children && <div className="mt-2">{entry.children}</div>}
        </GlassPanel>
      </motion.div>
    </div>
  );
};

const Timeline = forwardRef<HTMLDivElement, TimelineProps>(
  ({ items, variant = "alternating", compact, className, ...props }, ref) => {
    const railOffset = variant === "alternating" ? "left-5 md:left-1/2 md:-translate-x-px" : "left-[22px]";
    const innerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
      target: innerRef,
      offset: ["start 80%", "end 20%"],
    });
    const fillHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    return (
      <div
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn("relative", className)}
        {...props}
      >
        {/* Vertical rail — base track */}
        <span
          aria-hidden
          className={cn(
            "absolute top-0 bottom-0 w-px",
            railOffset,
            "bg-[linear-gradient(180deg,transparent,hsl(var(--border)/0.6)_8%,hsl(var(--border)/0.6)_92%,transparent)]"
          )}
        />
        {/* Liquid scroll-fill */}
        <motion.span
          aria-hidden
          style={{ height: fillHeight }}
          className={cn(
            "absolute top-0 w-[2px] -translate-x-[0.5px] rounded-full",
            railOffset,
            "bg-[linear-gradient(180deg,hsl(var(--primary)),hsl(var(--accent)),hsl(var(--secondary)))]",
            "shadow-[0_0_18px_hsl(var(--primary)/0.55)]"
          )}
        />
        {/* Glow halo behind fill */}
        <motion.span
          aria-hidden
          style={{ height: fillHeight }}
          className={cn(
            "absolute top-0 w-[6px] -translate-x-[2.5px] blur-md opacity-60",
            railOffset,
            "bg-[linear-gradient(180deg,hsl(var(--primary)/0.7),hsl(var(--accent)/0.6),hsl(var(--secondary)/0.7))]"
          )}
        />

        <div className={cn(variant === "rail" ? (compact ? "space-y-4" : "space-y-6") : "space-y-12 md:space-y-16")}> 
          {items.map((entry, i) =>
            variant === "alternating" ? (
              <AlternatingItem key={entry.id} entry={entry} index={i} />
            ) : (
              <RailItem key={entry.id} entry={entry} compact={compact} />
            )
          )}
        </div>
      </div>
    );
  }
);
Timeline.displayName = "Timeline";

export default Timeline;
