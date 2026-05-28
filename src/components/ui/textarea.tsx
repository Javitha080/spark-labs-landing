import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = ({ className, ref, ...props }: TextareaProps & { ref?: React.Ref<HTMLTextAreaElement> }) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-white/10 bg-background/40 backdrop-blur-xl px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-muted-foreground/60 transition-[border-color,box-shadow] duration-300 ease-out focus-visible:outline-none focus-visible:border-primary/40 focus-visible:shadow-[0_0_20px_hsl(var(--primary)/0.15),inset_0_1px_0_rgba(255,255,255,0.1)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
};
Textarea.displayName = "Textarea";

export { Textarea };
