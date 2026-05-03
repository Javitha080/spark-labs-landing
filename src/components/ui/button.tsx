import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden group border border-white/10 backdrop-blur-xl",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 active:translate-y-0 shadow-lg",
        destructive: "bg-gradient-to-r from-destructive via-destructive to-destructive/80 text-destructive-foreground hover:shadow-[0_0_30px_hsl(var(--destructive)/0.4)] hover:-translate-y-0.5 active:translate-y-0 shadow-lg",
        outline: "border-2 border-border/50 bg-gradient-to-br from-background/60 via-background/40 to-background/60 hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-xl",
        secondary: "bg-gradient-to-r from-secondary via-secondary to-secondary/80 text-secondary-foreground hover:shadow-[0_0_30px_hsl(var(--secondary)/0.4)] hover:-translate-y-0.5 active:translate-y-0 shadow-lg",
        ghost: "hover:bg-gradient-to-br hover:from-accent/20 hover:to-accent/10 hover:border-accent/30 hover:shadow-[0_0_15px_hsl(var(--accent)/0.2)] backdrop-blur-md",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_60px_hsl(var(--secondary)/0.4)] hover:-translate-y-1 active:translate-y-0 shadow-xl",
        cta: "bg-gradient-to-r from-accent via-accent to-secondary text-accent-foreground hover:shadow-[0_0_40px_hsl(var(--accent)/0.5)] hover:shadow-[0_0_50px_hsl(var(--secondary)/0.4)] hover:-translate-y-1 active:translate-y-0 shadow-xl",
        glass: "bg-gradient-to-br from-background/50 via-background/30 to-background/50 border border-white/10 hover:border-white/20 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] backdrop-blur-xl",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-10 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-11 w-11 rounded-xl",
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
        {/* Liquid Glass Shimmer Effect */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700 animate-shimmer" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
