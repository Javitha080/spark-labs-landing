import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First letters of the first two words, for avatar/cover fallbacks. */
export function initialsOf(name: string) {
  const parts = (name ?? "").split(/\s+/).filter(Boolean);
  const text = parts
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
  return text || "?";
}

/** 1.2k / 23.4k / 1.2M — compact counters for the card meta rows. */
export function formatCompact(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
