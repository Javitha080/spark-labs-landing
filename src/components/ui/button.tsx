// react-doctor-disable only-export-components
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium",
    "ring-offset-background transition-[transform,box-shadow,background-color,border-color] duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "overflow-hidden group will-change-transform",
    "border border-white/10 backdrop-blur-xl",
    // top specular highlight (compositor-only, no animated filter)
    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary/85 text-primary-foreground shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.55)] hover:bg-primary hover:shadow-[0_12px_32px_-10px_hsl(var(--primary)/0.65)] hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive/85 text-destructive-foreground shadow-[0_8px_24px_-12px_hsl(var(--destructive)/0.55)] hover:bg-destructive hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "bg-background/40 hover:bg-background/60 hover:border-primary/40 hover:shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:shadow-[0_10px_30px_-12px_hsl(var(--secondary)/0.5)] hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "border-transparent bg-transparent hover:bg-foreground/5 hover:border-white/10 backdrop-blur-md",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline backdrop-blur-none",
        hero:
          "bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground shadow-[0_15px_45px_-15px_hsl(var(--primary)/0.6)] hover:shadow-[0_20px_60px_-15px_hsl(var(--accent)/0.55)] hover:-translate-y-1 active:translate-y-0",
        cta:
          "bg-gradient-to-r from-accent via-accent to-secondary text-accent-foreground shadow-[0_15px_45px_-15px_hsl(var(--accent)/0.6)] hover:shadow-[0_20px_60px_-15px_hsl(var(--accent)/0.55)] hover:-translate-y-1 active:translate-y-0",
        glass:
          "bg-background/30 hover:bg-background/45 hover:border-white/25 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-10 rounded-xl px-4",
        lg: "h-12 rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg font-semibold",
        icon: "size-11 rounded-2xl",
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

const Sheen = () => (
  <span
    aria-hidden
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
  >
    {/* Liquid sheen sweep on hover */}
    <span className="absolute -inset-y-1 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[450%] transition-transform duration-1000 ease-out" />
  </span>
);

const Button = ({ className, variant, size, asChild = false, children, ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
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
        <Sheen />
        {children}
      </Comp>
    );
  };
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
