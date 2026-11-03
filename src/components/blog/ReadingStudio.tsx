import { Coffee, Eye, Minus, Moon, Plus, RotateCcw, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONTS,
  LH_MAX,
  LH_MIN,
  PRESETS,
  SIZE_MAX,
  SIZE_MIN,
  THEMES,
  useReadingPrefs,
  type WidthKey,
} from "./reading-prefs";

const PRESET_ICONS = { coffee: Coffee, moon: Moon, target: Target, eye: Eye };

const chipBase =
  "rounded-xl border text-sm font-medium transition-all duration-200 focus-visible:outline-2";
const chipOn = "border-transparent bg-[var(--rs-accent)] text-[var(--rs-bg)] shadow-md";
const chipOff = "rs-border rs-soft rs-muted hover:text-[var(--rs-fg)]";

function Section({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h4 className="rs-muted text-[11px] font-bold uppercase tracking-[0.16em]" style={{ fontFamily: "var(--font-sans)" }}>
          {title}
        </h4>
        {value && <span className="rs-accent-text text-xs font-semibold tabular-nums">{value}</span>}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(chipBase, "px-2 py-2", value === o.key ? chipOn : chipOff)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  hint,
  kbd,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
  kbd?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium">
          {label}
          {kbd && <span className="kbd">{kbd}</span>}
        </span>
        <span className="rs-muted block text-xs leading-snug">{hint}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-transparent bg-[var(--rs-accent)]" : "rs-border rs-soft",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full shadow transition-all duration-200",
            checked ? "left-[22px] bg-[var(--rs-bg)]" : "left-0.5 bg-[var(--rs-muted)]",
          )}
        />
      </span>
    </button>
  );
}

export default function ReadingStudio({ compact = false }: { compact?: boolean }) {
  const { prefs, set, reset } = useReadingPrefs();
  const width: { key: WidthKey; label: string }[] = [
    { key: "narrow", label: "Narrow" },
    { key: "comfortable", label: "Cozy" },
    { key: "wide", label: "Wide" },
  ];

  return (
    <div className={cn("space-y-6", compact && "pb-2")}>
      {/* Presets */}
      <Section title="Quick presets">
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => set(p.patch)}
              className={cn(chipBase, chipOff, "flex items-center gap-2 px-3 py-2.5 text-left")}
            >
              {(() => { const I = PRESET_ICONS[p.icon]; return <I className="size-4 rs-accent-text" aria-hidden />; })()}
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Theme */}
      <Section title="Reading theme" value={THEMES.find((t) => t.key === prefs.theme)?.label}>
        <div role="radiogroup" aria-label="Reading theme" className="flex gap-2.5">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={prefs.theme === t.key}
              aria-label={`${t.label} theme`}
              onClick={() => set({ theme: t.key })}
              className={cn(
                "grid size-11 flex-1 place-items-center rounded-full border-2 transition-all duration-200",
                prefs.theme === t.key ? "scale-110 border-[var(--rs-accent)] shadow-lg" : "border-[var(--rs-border)] hover:scale-105",
              )}
              style={{ background: t.bg, maxWidth: 48 }}
            >
              <span className="text-[13px] font-bold" style={{ color: t.fg, fontFamily: "var(--font-serif)" }}>Aa</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Typeface */}
      <Section title="Typeface" value={FONTS.find((f) => f.key === prefs.font)?.hint}>
        <div role="radiogroup" aria-label="Typeface" className="grid grid-cols-5 gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={prefs.font === f.key}
              onClick={() => set({ font: f.key })}
              className={cn(chipBase, "flex flex-col items-center gap-0.5 px-1 py-2", prefs.font === f.key ? chipOn : chipOff)}
              title={f.hint}
            >
              <span className="text-lg leading-none" style={{ fontFamily: f.css }}>Ag</span>
              <span className="text-[9.5px] font-semibold">{f.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Size */}
      <Section title="Text size" value={`${prefs.size}px`}>
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Smaller text" onClick={() => set({ size: prefs.size - 1 })} disabled={prefs.size <= SIZE_MIN} className={cn(chipBase, chipOff, "grid size-9 place-items-center disabled:opacity-40")}>
            <Minus className="size-4" />
          </button>
          <input
            type="range"
            min={SIZE_MIN}
            max={SIZE_MAX}
            step={1}
            value={prefs.size}
            onChange={(e) => set({ size: Number(e.target.value) })}
            aria-label="Text size"
            className="h-2 flex-1 cursor-pointer"
            style={{ accentColor: "var(--rs-accent)" }}
          />
          <button type="button" aria-label="Larger text" onClick={() => set({ size: prefs.size + 1 })} disabled={prefs.size >= SIZE_MAX} className={cn(chipBase, chipOff, "grid size-9 place-items-center disabled:opacity-40")}>
            <Plus className="size-4" />
          </button>
        </div>
      </Section>

      {/* Line height */}
      <Section title="Line spacing" value={prefs.lineHeight.toFixed(2)}>
        <input
          type="range"
          min={LH_MIN}
          max={LH_MAX}
          step={0.05}
          value={prefs.lineHeight}
          onChange={(e) => set({ lineHeight: Number(e.target.value) })}
          aria-label="Line spacing"
          className="h-2 w-full cursor-pointer"
          style={{ accentColor: "var(--rs-accent)" }}
        />
      </Section>

      {/* Width + align */}
      <Section title="Column width">
        <Segmented label="Column width" value={prefs.width} options={width} onChange={(v) => set({ width: v })} />
      </Section>
      <Section title="Alignment">
        <Segmented
          label="Alignment"
          value={prefs.align}
          options={[
            { key: "left", label: "Left" },
            { key: "justify", label: "Justified" },
          ]}
          onChange={(v) => set({ align: v })}
        />
      </Section>

      {/* Assists */}
      <Section title="Reading aids">
        <div className="space-y-1">
          <Switch checked={prefs.focus} onChange={(v) => set({ focus: v })} label="Focus mode" hint="Dims everything except the paragraph you’re on." kbd="F" />
          <Switch checked={prefs.ruler} onChange={(v) => set({ ruler: v })} label="Reading ruler" hint="A soft highlight band that follows your cursor." kbd="R" />
          <Switch checked={prefs.dropCap} onChange={(v) => set({ dropCap: v })} label="Drop cap" hint="Decorative first letter." />
          <Switch checked={prefs.calm} onChange={(v) => set({ calm: v })} label="Calm motion" hint="Turns off animations and smooth scrolling." />
          <Switch checked={prefs.resume} onChange={(v) => set({ resume: v })} label="Resume where I left off" hint="Remember your position in each article." />
        </div>
      </Section>

      <button
        type="button"
        onClick={reset}
        className={cn(chipBase, chipOff, "flex w-full items-center justify-center gap-2 py-2.5")}
      >
        <RotateCcw className="size-3.5" /> Reset to defaults
      </button>
      <p className="rs-muted text-center text-[11px] leading-relaxed">
        Shortcuts: <span className="kbd">+</span> <span className="kbd">−</span> size · <span className="kbd">T</span> theme · <span className="kbd">L</span> listen
      </p>
    </div>
  );
}
