import { type HTMLAttributes, type ReactNode, useRef } from "react";
import { m, useScroll, useTransform, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TimelineEntry {
  id: string;
  meta?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  children?: ReactNode;
}

interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  items: TimelineEntry[];
  variant?: "alternating" | "rail";
  compact?: boolean;
}

const TimelineNode = ({
  icon: Icon,
}: {
  icon?: TimelineEntry["icon"];
  accent?: string;
}) => (
  <div
    className={cn(
      "tl-liquid-node relative size-12 rounded-2xl flex items-center justify-center shrink-0",
      "z-20"
    )}
  >
    {Icon ? <Icon className="size-5 text-foreground/80 relative z-10" /> : null}
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
      "tl-clean-card overflow-hidden rounded-2xl p-6 md:p-8",
      "transition-all duration-400 ease-out",
      "hover:tl-clean-card--active hover:-translate-y-0.5",
      "group relative",
      className
    )}
  >
    {/* Top sheen — subtle */}
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent opacity-60"
    />
    <div className="relative z-10">{children}</div>
  </div>
);

const TimelineItem = ({ 
  entry, 
  index, 
  variant 
}: { 
  entry: TimelineEntry; 
  index: number;
  variant: "alternating" | "rail";
}) => {
  const isLeft = index % 2 === 0;
  const isAlternating = variant === "alternating";

  return (
    <m.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
      className={cn(
        "relative flex w-full group",
        isAlternating ? (isLeft ? "md:flex-row" : "md:flex-row-reverse") : "flex-row",
        "items-start md:items-center"
      )}
    >
      {/* Node Container */}
      <div 
        className={cn(
          "absolute flex items-center justify-center top-0 md:top-1/2 md:-translate-y-1/2",
          isAlternating 
            ? "left-[22px] md:left-1/2 md:-translate-x-1/2" 
            : "left-[22px] -translate-x-1/2"
        )}
      >
        <m.div
          initial={{ scale: 0.95 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.1 + 0.2 }}
        >
          <TimelineNode icon={entry.icon} accent={entry.accent} />
        </m.div>
      </div>

      {/* Content Panel */}
      <div
        className={cn(
          "w-full",
          isAlternating 
            ? "md:w-5/12 pl-16 md:pl-0" + (isLeft ? " md:pr-12" : " md:pl-12")
            : "pl-16 w-full"
        )}
      >
        <GlassPanel>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-2">
            {entry.meta && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-foreground/5 text-foreground/60 border border-foreground/10 self-start">
                {entry.meta}
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-xl md:text-2xl text-foreground mb-2">
            {entry.title}
          </h3>
          {entry.description && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {entry.description}
            </p>
          )}
          {entry.children && <div className="mt-4">{entry.children}</div>}
        </GlassPanel>
      </div>

      {/* Empty space for alternating layout balancing */}
      {isAlternating && (
        <div className="hidden md:block md:w-5/12" />
      )}
    </m.div>
  );
};

const Timeline = ({ items, variant = "rail", compact, className, ref, ...props }: TimelineProps & { ref?: React.Ref<HTMLDivElement> }) => {
    const railOffset = variant === "alternating" ? "left-[22px] md:left-1/2 md:-translate-x-px" : "left-[22px] -translate-x-[0.5px]";
    const innerRef = useRef<HTMLDivElement>(null);
    
    // Smooth scroll progress
    const { scrollYProgress } = useScroll({
      target: innerRef,
      offset: ["start center", "end center"],
    });
    
    const smoothProgress = useSpring(scrollYProgress, {
      stiffness: 100,
      damping: 30,
      restDelta: 0.001
    });

    const fillHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

    return (
      <div
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn("relative py-10", className)}
        {...props}
      >
        {/* Background Rail — simple monochrome line with faded ends */}
        <div
          aria-hidden
          className={cn(
            "tl-rail-bg absolute top-0 bottom-0",
            railOffset
          )}
        />
        
        {/* Animated Fill Rail — monochrome */}
        <m.div
          aria-hidden
          style={{ height: fillHeight }}
          className={cn(
            "tl-rail-fill absolute top-0 z-10",
            railOffset
          )}
        />

        <div className={cn(
          "relative z-20",
          compact ? "space-y-8" : "space-y-12 md:space-y-20"
        )}> 
          {items.map((entry, i) => (
            <TimelineItem 
              key={entry.id} 
              entry={entry} 
              index={i} 
              variant={variant} 
            />
          ))}
        </div>
      </div>
    );
  };
Timeline.displayName = "Timeline";

export default Timeline;
