// Adapted from Rare UI (https://rareui.com) — Commons Clause License.
// Adapted for Tailwind CSS 3.4 & framer-motion LazyMotion strict (m.*).

import { m } from "framer-motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export type AIOrbStatus = "idle" | "thinking" | "streaming" | "auth-required";

interface AIStatusOrbProps {
  status?: AIOrbStatus;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

const STATUS_META: Record<
  AIOrbStatus,
  { label: string; dotClass: string; ringClass: string; textClass: string }
> = {
  idle: {
    label: "Ready",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]",
    ringClass: "from-primary via-accent to-secondary",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  thinking: {
    label: "Thinking...",
    dotClass: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.85)]",
    ringClass: "from-amber-400 via-primary to-accent",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  streaming: {
    label: "Streaming...",
    dotClass: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]",
    ringClass: "from-primary via-sky-400 to-accent",
    textClass: "text-sky-600 dark:text-sky-400",
  },
  "auth-required": {
    label: "Sign in required",
    dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.75)]",
    ringClass: "from-rose-500/80 via-amber-500/80 to-primary/80",
    textClass: "text-rose-600 dark:text-rose-400",
  },
};

export function AIStatusOrb({
  status = "idle",
  compact = false,
  showLabel = false,
  className,
}: AIStatusOrbProps) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const meta = STATUS_META[status];
  const isBusy = status === "thinking" || status === "streaming";

  const orbSize = compact ? "size-7" : "size-9";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex items-center justify-center rounded-full shrink-0",
          orbSize
        )}
      >
        {/* Outer fluid aura */}
        <m.span
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-tr opacity-75 blur-[3px]",
            meta.ringClass
          )}
          animate={
            reducedMotion
              ? undefined
              : isBusy
                ? { scale: [1, 1.18, 1], rotate: [0, 180, 360] }
                : { scale: [1, 1.07, 1], rotate: [0, 90, 0] }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  duration: isBusy ? 1.8 : 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />

        {/* Core liquid sphere */}
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full bg-gradient-to-br p-[2px] shadow-inner",
            meta.ringClass,
            orbSize
          )}
        >
          <span className="size-full rounded-full bg-background/85 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            <m.span
              className={cn(
                "block rounded-full bg-gradient-to-tr opacity-90",
                meta.ringClass,
                compact ? "size-3.5" : "size-4"
              )}
              animate={
                reducedMotion
                  ? undefined
                  : isBusy
                    ? { scale: [0.85, 1.15, 0.85] }
                    : { scale: [0.95, 1.05, 0.95] }
              }
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: isBusy ? 0.9 : 3, repeat: Infinity, ease: "easeInOut" }
              }
            />
          </span>
        </span>

        {/* Live status dot */}
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background",
            meta.dotClass
          )}
        />
      </span>

      {showLabel && (
        <span className={cn("text-xs font-medium tracking-tight", meta.textClass)}>
          {meta.label}
        </span>
      )}
    </span>
  );
}

export default AIStatusOrb;
