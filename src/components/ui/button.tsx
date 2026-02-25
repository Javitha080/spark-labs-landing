import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden group border border-border/20 backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-primary/80 text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl",
        destructive: "bg-destructive/80 text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-card/80 hover:bg-muted/80",
        secondary: "bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-primary/80 text-primary-foreground hover:bg-primary/90 shadow-[0_0_40px_hsl(var(--primary-glow)/0.4)] hover:shadow-[0_0_50px_hsl(var(--primary-glow)/0.6)] hover:-translate-y-0.5",
        cta: "bg-accent/80 text-accent-foreground hover:bg-accent/90 shadow-[0_0_30px_hsl(var(--accent-glow)/0.4)] hover:shadow-[0_0_40px_hsl(var(--accent-glow)/0.6)] hover:-translate-y-0.5",
        glass: "glass-card bg-background/40 hover:bg-white/20 dark:hover:bg-white/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {/* Liquid Blur Background (Header Style) */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 opacity-50 blur-lg" />
          <div className="absolute top-0 left-1/4 w-12 h-12 bg-primary/30 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-10 h-10 bg-secondary/30 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
