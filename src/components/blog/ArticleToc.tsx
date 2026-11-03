import { m } from "framer-motion";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  /** Heading level, clamped 2..4 */
  level: number;
}

function goToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

export default function ArticleToc({
  toc,
  activeId,
  onNavigate,
}: {
  toc: TocItem[];
  activeId: string;
  onNavigate?: () => void;
}) {
  if (toc.length === 0) {
    return <p className="rs-muted py-6 text-center text-sm">This article has no sections.</p>;
  }
  const activeIndex = Math.max(0, toc.findIndex((t) => t.id === activeId));

  return (
    <nav aria-label="Table of contents">
      <p className="rs-muted mb-3 text-[11px] font-bold uppercase tracking-[0.16em]">
        {activeId ? `Section ${activeIndex + 1} of ${toc.length}` : `${toc.length} sections`}
      </p>
      <ol className="relative space-y-0.5 border-l rs-border">
        {toc.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id} className="relative">
              {isActive && (
                <m.span
                  layoutId="toc-active"
                  className="absolute -left-px top-1 bottom-1 w-0.5 rounded-full bg-[var(--rs-accent)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  goToHeading(item.id);
                  onNavigate?.();
                }}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "block rounded-r-lg py-1.5 pr-2 text-[13.5px] leading-snug transition-colors",
                  item.level === 2 && "pl-4 font-medium",
                  item.level === 3 && "pl-7",
                  item.level >= 4 && "pl-10 text-[12.5px]",
                  isActive
                    ? "rs-accent-text bg-[color-mix(in_srgb,var(--rs-accent)_8%,transparent)]"
                    : "rs-muted hover:text-[var(--rs-fg)]",
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
