import * as React from "react";

import { cn } from "@/lib/utils";

const Input = ({ className, type, ref, ...props }: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/10 bg-background/40 backdrop-blur-xl px-3 py-2 text-base ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 transition-[border-color,box-shadow] duration-300 ease-out focus-visible:outline-none focus-visible:border-primary/40 focus-visible:shadow-[0_0_20px_hsl(var(--primary)/0.15),inset_0_1px_0_rgba(255,255,255,0.1)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  };
Input.displayName = "Input";

export { Input };
