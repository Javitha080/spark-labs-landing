// react-doctor-disable only-export-components
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-white/10 backdrop-blur-xl px-2.5 py-0.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,box-shadow,border-color] duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/80 text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]",
        secondary: "bg-secondary/60 text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive/80 text-destructive-foreground border-destructive/30 hover:bg-destructive/90",
        outline: "bg-background/30 text-foreground hover:bg-background/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
