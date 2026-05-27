import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Apple Liquid Glass Card.
 *
 * Compositor-friendly: only static blur + transform/opacity transitions.
 * No animated filters, no orb pulses (kept opt-in via className if needed).
 */
const Card = ({ className, children, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-3xl",
        "border border-white/10 bg-background/45",
        "backdrop-blur-2xl backdrop-saturate-150",
        "shadow-[0_20px_60px_-25px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(0,0,0,0.18)]",
        "transition-[transform,box-shadow,border-color] duration-500 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_25px_70px_-20px_hsl(var(--primary)/0.30),inset_0_1px_0_rgba(255,255,255,0.14)]",
        className
      )}
      {...props}
    >
      {/* Top specular highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />
      {/* Soft inner glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.10),transparent_55%)]"
      />
      <div className="relative">{children}</div>
    </div>
  );
Card.displayName = "Card";

const CardHeader = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props} />
  );
CardHeader.displayName = "CardHeader";

const CardTitle = ({ className, ref, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLParagraphElement> }) => (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text",
        className
      )}
      {...props}
    />
  );
CardTitle.displayName = "CardTitle";

const CardDescription = ({ className, ref, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground/80", className)} {...props} />
  );
CardDescription.displayName = "CardDescription";

const CardContent = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
    <div ref={ref} className={cn("p-6 pt-4", className)} {...props} />
  );
CardContent.displayName = "CardContent";

const CardFooter = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-4", className)} {...props} />
  );
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
