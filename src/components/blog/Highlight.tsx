import { Fragment } from "react";

/** Wraps case-insensitive matches of `query` in <mark>. Safe: no HTML injection. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < text.length) {
    const hit = lower.indexOf(needle, i);
    if (hit === -1) {
      parts.push(<Fragment key={k++}>{text.slice(i)}</Fragment>);
      break;
    }
    if (hit > i) parts.push(<Fragment key={k++}>{text.slice(i, hit)}</Fragment>);
    parts.push(
      <mark key={k++} className="rounded bg-primary/25 px-0.5 text-inherit">
        {text.slice(hit, hit + needle.length)}
      </mark>,
    );
    i = hit + needle.length;
  }
  return <>{parts}</>;
}
