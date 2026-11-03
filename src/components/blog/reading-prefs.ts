"use client";

import { useCallback, useSyncExternalStore, type CSSProperties } from "react";

export type ThemeKey = "default" | "paper" | "sepia" | "dusk" | "amoled";
export type FontKey = "serif" | "sans" | "hyperlegible" | "dyslexic" | "mono";
export type WidthKey = "narrow" | "comfortable" | "wide";

export interface ReadingPrefs {
  theme: ThemeKey;
  font: FontKey;
  size: number; // px, 15..26
  lineHeight: number; // 1.4..2.3
  width: WidthKey;
  align: "left" | "justify";
  dropCap: boolean;
  focus: boolean;
  ruler: boolean;
  calm: boolean;
  resume: boolean;
}

export const SIZE_MIN = 15;
export const SIZE_MAX = 26;
export const LH_MIN = 1.4;
export const LH_MAX = 2.3;

export const DEFAULT_PREFS: ReadingPrefs = {
  theme: "default",
  font: "serif",
  size: 18,
  lineHeight: 1.8,
  width: "comfortable",
  align: "left",
  dropCap: false,
  focus: false,
  ruler: false,
  calm: false,
  resume: true,
};

export const THEMES: { key: ThemeKey; label: string; bg: string; fg: string }[] = [
  // Site swatch mirrors the light/dark theme system; fg is the brand primary.
  { key: "default", label: "Site", bg: "linear-gradient(135deg,#ffffff 50%,#030712 50%)", fg: "#8b5cf6" },
  { key: "paper", label: "Paper", bg: "#f4eee2", fg: "#2a251e" },
  { key: "sepia", label: "Sepia", bg: "#e9d9b8", fg: "#3b2d1f" },
  { key: "dusk", label: "Dusk", bg: "#161a26", fg: "#dde2ef" },
  { key: "amoled", label: "Black", bg: "#000000", fg: "#e9e9e9" },
];

export const FONTS: { key: FontKey; label: string; hint: string; css: string }[] = [
  // The CSS variables resolve inside .rs-stage (defined in blog-reader.css).
  { key: "serif", label: "Serif", hint: "Lora", css: "var(--font-serif)" },
  { key: "sans", label: "Sans", hint: "Inter", css: "var(--font-sans)" },
  { key: "hyperlegible", label: "Legible", hint: "Atkinson", css: '"Atkinson Hyperlegible", var(--font-sans)' },
  // Self-hosted copy lives at /fonts/OpenDyslexic-Regular.woff (blog-reader.css).
  { key: "dyslexic", label: "Dyslexic", hint: "OpenDyslexic", css: '"OpenDyslexic", var(--font-sans)' },
  { key: "mono", label: "Mono", hint: "JetBrains", css: "var(--font-mono)" },
];

/** Fonts that need a code-split @fontsource stylesheet the first time they're picked. */
export const LAZY_FONT_SOURCES: Record<string, () => Promise<unknown>> = {
  serif: () => import("@fontsource/lora"),
  hyperlegible: () => import("@fontsource/atkinson-hyperlegible"),
};

const fontsRequested = new Set<string>();
/** Lazy-loads the @fontsource stylesheet for a picked font once per session. */
export function ensureFontLoaded(font: string) {
  const load = LAZY_FONT_SOURCES[font];
  if (!load) return;
  // Lora is the default reading face — warm it up right away, rest on demand.
  if (font !== "serif" && fontsRequested.has(font)) return;
  fontsRequested.add(font);
  load().catch(() => undefined);
}

export const PRESETS: { key: string; label: string; icon: "coffee" | "moon" | "target" | "eye"; patch: Partial<ReadingPrefs> }[] = [
  { key: "comfort", label: "Comfort", icon: "coffee", patch: { theme: "default", font: "serif", size: 18, lineHeight: 1.8, width: "comfortable", align: "left", focus: false, ruler: false, dropCap: false } },
  { key: "night", label: "Night owl", icon: "moon", patch: { theme: "dusk", font: "serif", size: 19, lineHeight: 1.85, width: "comfortable", focus: false } },
  { key: "focus", label: "Deep focus", icon: "target", patch: { theme: "paper", font: "serif", size: 20, lineHeight: 1.9, width: "narrow", focus: true, ruler: false, dropCap: true } },
  { key: "access", label: "Easy read", icon: "eye", patch: { theme: "sepia", font: "dyslexic", size: 20, lineHeight: 2.1, width: "narrow", align: "left", focus: false, ruler: true } },
];

const KEY = "yic-reading-prefs-v2";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: ReadingPrefs = DEFAULT_PREFS;

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function sanitize(input: Partial<ReadingPrefs>): ReadingPrefs {
  const p = { ...DEFAULT_PREFS, ...input };
  return {
    theme: THEMES.some((t) => t.key === p.theme) ? p.theme : DEFAULT_PREFS.theme,
    font: FONTS.some((f) => f.key === p.font) ? p.font : DEFAULT_PREFS.font,
    size: clamp(Number(p.size) || DEFAULT_PREFS.size, SIZE_MIN, SIZE_MAX),
    lineHeight: clamp(Number(p.lineHeight) || DEFAULT_PREFS.lineHeight, LH_MIN, LH_MAX),
    width: (["narrow", "comfortable", "wide"] as const).includes(p.width) ? p.width : "comfortable",
    align: p.align === "justify" ? "justify" : "left",
    dropCap: !!p.dropCap,
    focus: !!p.focus,
    ruler: !!p.ruler,
    calm: !!p.calm,
    resume: p.resume !== false,
  };
}

function read(): ReadingPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cachedValue;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? sanitize(JSON.parse(raw)) : DEFAULT_PREFS;
  } catch {
    cachedValue = DEFAULT_PREFS;
  }
  return cachedValue;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setPrefs(patch: Partial<ReadingPrefs>) {
  const next = sanitize({ ...read(), ...patch });
  ensureFontLoaded(next.font);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cachedRaw = null;
    cachedValue = next;
  }
  listeners.forEach((l) => l());
}

export function useReadingPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
  const set = useCallback((patch: Partial<ReadingPrefs>) => setPrefs(patch), []);
  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), []);
  return { prefs, set, reset };
}

/** Everything the themed stage element needs - attributes, classes and CSS variables. */
export function stageProps(p: ReadingPrefs) {
  return {
    "data-rtheme": p.theme,
    "data-rfont": p.font,
    "data-rwidth": p.width,
    className: [
      "rs-stage",
      p.calm ? "rs-calm" : "",
      p.focus ? "rs-focus" : "",
      p.dropCap ? "rs-dropcap" : "",
      p.align === "justify" ? "rs-align-justify" : "",
    ]
      .filter(Boolean)
      .join(" "),
    style: { "--rs-size": `${p.size}px`, "--rs-lh": String(p.lineHeight) } as CSSProperties,
  };
}

/* ───────── Reading list (bookmarks) ───────── */
const LIST_KEY = "yic-reading-list";
const listListeners = new Set<() => void>();
let listRaw: string | null = null;
let listValue: string[] = [];
const EMPTY: string[] = [];

function readList(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LIST_KEY);
  } catch {
    return listValue;
  }
  if (raw === listRaw) return listValue;
  listRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    listValue = Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    listValue = [];
  }
  return listValue;
}

export function toggleSaved(slug: string) {
  const cur = readList();
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [slug, ...cur];
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
  } catch {
    listRaw = null;
    listValue = next;
  }
  listListeners.forEach((l) => l());
  return next.includes(slug);
}

export function useReadingList() {
  const saved = useSyncExternalStore(
    (cb) => {
      listListeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === LIST_KEY && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listListeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    readList,
    () => EMPTY,
  );
  return { saved, has: (slug: string) => saved.includes(slug), toggle: toggleSaved };
}
