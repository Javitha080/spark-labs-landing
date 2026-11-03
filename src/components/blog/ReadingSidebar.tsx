import { useState } from "react";
import { m } from "framer-motion";
import { Focus, Headphones, ListTree, Minus, Palette, Pause, Play, Plus, Ruler, SkipBack, SkipForward, SlidersHorizontal, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/blog-content";
import ArticleToc from "./ArticleToc";
import ReadingStudio from "./ReadingStudio";
import { THEMES, setPrefs, useReadingPrefs } from "./reading-prefs";
import type { ListenApi } from "./useListen";

export type SidebarTab = "contents" | "settings";

interface Props {
  toc: TocItem[];
  activeId: string;
  percent: number;
  minutesLeft: number;
  listen: ListenApi;
  tab: SidebarTab;
  onTab: (t: SidebarTab) => void;
  onNavigate?: () => void;
  /** Cap the scroll body (desktop sticky rail) or let the container scroll (mobile sheet). */
  bodyClassName?: string;
}

const RATES = [0.8, 1, 1.25, 1.5, 1.75];

function Ring({ percent }: { percent: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="-rotate-90 size-14" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" style={{ stroke: "var(--rs-border)" }} />
        <m.circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - percent / 100) }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          style={{ stroke: "var(--rs-accent)" }}
        />
      </svg>
      <span className="absolute text-[13px] font-bold tabular-nums">{percent}</span>
    </div>
  );
}

export default function ReadingSidebar({ toc, activeId, percent, minutesLeft, listen, tab, onTab, onNavigate, bodyClassName }: Props) {
  const { prefs, set } = useReadingPrefs();
  const [rateOpen, setRateOpen] = useState(false);

  const cycleTheme = () => {
    const i = THEMES.findIndex((t) => t.key === prefs.theme);
    set({ theme: THEMES[(i + 1) % THEMES.length].key });
  };

  const quick = "rs-border rs-soft grid size-10 place-items-center rounded-xl border transition hover:text-[var(--rs-accent)] disabled:opacity-40";

  return (
    <div className="rs-surface flex flex-col overflow-hidden rounded-3xl shadow-sm" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Progress header */}
      <div className="flex items-center gap-3.5 p-4 pb-3">
        <Ring percent={percent} />
        <div className="min-w-0">
          <p className="font-display text-base font-bold leading-tight">
            {percent >= 99 ? "Finished — nice read!" : percent < 2 ? "Ready when you are" : `${percent}% read`}
          </p>
          <p className="rs-muted text-xs">
            {percent >= 99 ? "Scroll down for more stories" : `About ${Math.max(1, minutesLeft)} min left`}
          </p>
        </div>
      </div>

      {/* Listen */}
      {listen.supported && (
        <div className="px-4 pb-3">
          <div className="rs-soft flex items-center gap-2 rounded-2xl p-2">
            <button
              type="button"
              onClick={listen.toggle}
              aria-label={listen.status === "playing" ? "Pause listening" : "Listen to this article"}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--rs-accent)] text-[var(--rs-bg)] shadow-md transition hover:scale-105"
            >
              {listen.status === "playing" ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                <Headphones className="size-3.5 rs-accent-text" /> Listen
                <kbd className="kbd">L</kbd>
              </p>
              <p className="rs-muted truncate text-[11px]">
                {listen.status === "idle" ? "Read aloud, hands-free" : `Paragraph ${listen.index + 1} of ${listen.total}`}
              </p>
            </div>
            {listen.status !== "idle" && (
              <>
                <button type="button" onClick={listen.prev} aria-label="Previous paragraph" className="grid size-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><SkipBack className="size-3.5" /></button>
                <button type="button" onClick={listen.next} aria-label="Next paragraph" className="grid size-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><SkipForward className="size-3.5" /></button>
                <button type="button" onClick={listen.stop} aria-label="Stop listening" className="grid size-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><Square className="size-3.5" /></button>
              </>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRateOpen((o) => !o)}
                aria-label="Playback speed"
                className="rs-border rounded-lg border px-2 py-1 text-[11px] font-bold tabular-nums"
              >
                {listen.rate}×
              </button>
              {rateOpen && (
                <div className="rs-surface absolute bottom-full right-0 z-10 mb-1 rounded-xl p-1 shadow-xl">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        listen.setRate(r);
                        setRateOpen(false);
                      }}
                      className={cn("block w-full rounded-lg px-3 py-1 text-left text-xs tabular-nums", listen.rate === r ? "bg-[var(--rs-accent)] text-[var(--rs-bg)]" : "hover:bg-[var(--rs-soft)]")}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick controls */}
      <div className="flex items-center gap-1.5 px-4 pb-3">
        <button type="button" className={quick} aria-label="Smaller text" onClick={() => set({ size: prefs.size - 1 })}><Minus className="size-4" /></button>
        <span className="w-10 text-center text-xs font-bold tabular-nums">{prefs.size}px</span>
        <button type="button" className={quick} aria-label="Larger text" onClick={() => set({ size: prefs.size + 1 })}><Plus className="size-4" /></button>
        <span className="mx-1 h-6 w-px rs-border border-l" />
        <button type="button" className={quick} aria-label="Cycle reading theme" onClick={cycleTheme} title="Cycle theme (T)"><Palette className="size-4" /></button>
        <button type="button" className={cn(quick, prefs.focus && "!border-transparent !bg-[var(--rs-accent)] !text-[var(--rs-bg)]")} aria-pressed={prefs.focus} aria-label="Toggle focus mode" onClick={() => setPrefs({ focus: !prefs.focus })} title="Focus mode (F)"><Focus className="size-4" /></button>
        <button type="button" className={cn(quick, prefs.ruler && "!border-transparent !bg-[var(--rs-accent)] !text-[var(--rs-bg)]")} aria-pressed={prefs.ruler} aria-label="Toggle reading ruler" onClick={() => setPrefs({ ruler: !prefs.ruler })} title="Reading ruler (R)"><Ruler className="size-4" /></button>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Reading panel" className="rs-border relative mx-4 grid grid-cols-2 rounded-xl border p-1">
        {([
          { key: "contents", label: "Contents", icon: ListTree },
          { key: "settings", label: "Settings", icon: SlidersHorizontal },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => onTab(t.key)}
            className={cn("relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors", tab === t.key ? "text-[var(--rs-bg)]" : "rs-muted hover:text-[var(--rs-fg)]")}
          >
            {tab === t.key && (
              <m.span layoutId="sidebar-tab" className="absolute inset-0 -z-10 rounded-lg bg-[var(--rs-accent)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            )}
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className={cn("thin-scroll overflow-y-auto p-4", bodyClassName)} role="tabpanel">
        {tab === "contents" ? (
          <ArticleToc toc={toc} activeId={activeId} onNavigate={onNavigate} />
        ) : (
          <ReadingStudio compact />
        )}
      </div>
    </div>
  );
}
