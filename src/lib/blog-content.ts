/**
 * Client-side content engine for blog articles.
 *
 * Ported from the reading-system package's sanitize-html pipeline onto
 * DOMPurify (site convention): author HTML is cleaned, every heading gets a
 * stable slug id instead of the old `heading-0..n` (deep links survive content
 * edits), tables are wrapped so they scroll inside the reading column, the
 * table of contents is extracted in the same pass, and a plain-text word count
 * backs the reading-time estimate (200 wpm — same intent as the original
 * `calculate_reading_time` DB trigger).
 *
 * Runs on the client only: reading pages hand parts of this to
 * dangerouslySetInnerHTML after sanitisation here.
 */
import DOMPurify from "dompurify";

export interface TocItem {
  id: string;
  text: string;
  /** Heading level, clamped 2..4 — matches what the TOC renders. */
  level: number;
}

const headingSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";

type SanitizeConfig = Parameters<typeof DOMPurify.sanitize>[1];

const SANITIZE_CONFIG: SanitizeConfig = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "mark", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "a", "img", "blockquote", "code", "pre", "span", "div", "hr",
    "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption",
  ],
  // Superset of the reader page's previous list: width/height/colspan/rowspan
  // keep legacy admin content intact, loading/decoding survive the img hook.
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "target", "rel", "class",
    "width", "height", "colspan", "rowspan", "start", "loading", "decoding",
  ],
};

let hooked = false;
function registerDomPurifyHooks() {
  if (hooked || typeof window === "undefined") return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      const external = /^https?:\/\//i.test(href) && !href.startsWith(window.location.origin);
      if (external) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
    if (node.tagName === "IMG") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
    }
  });
}

/** Plain-text word count for reading-time + progress estimates. */
export function countWords(html: string): number {
  if (!html) return 0;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.textContent ?? "";
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Same intent as the original `calculate_reading_time` DB trigger (200 wpm). */
export function readingMinutes(html: string): number {
  return Math.max(1, Math.round(countWords(html) / 200));
}

export interface ProcessedContent {
  html: string;
  toc: TocItem[];
  words: number;
}

/**
 * One pass over the author's HTML: sanitise → slugged heading ids (dedup'd) →
 * decide the TOC (h2..h4) → wrap every table → word count.
 */
export function processContent(raw: string): ProcessedContent {
  registerDomPurifyHooks();
  const clean = DOMPurify.sanitize(raw ?? "", SANITIZE_CONFIG);

  const doc = new DOMParser().parseFromString(clean, "text/html");
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  // Stable ids on every heading so the TOC and per-section anchor links agree
  // even when content is edited between visits.
  doc.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
    const text = (h.textContent ?? "").replace(/\s+/g, " ").trim();
    let id = headingSlug(text);
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    h.setAttribute("id", id);
    const level = Math.max(2, Math.min(4, Number(h.tagName.charAt(1))));
    if (text) toc.push({ id, text, level });
  });

  // Wrap tables after the heading pass so nested tables can't create stacked
  // wrappers.
  doc.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("rs-table-wrap")) return;
    const wrap = doc.createElement("div");
    wrap.className = "rs-table-wrap";
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });

  return { html: doc.body.innerHTML, toc, words: countWords(clean) };
}

export function validateContentSafety(content: string): string | null {
  // Defence in depth — sanitisation already strips these on render.
  if (/<script[\s>]/i.test(content)) return "Content contains a <script> tag";
  if (/javascript:/i.test(content)) return "Content contains a javascript: link";
  return null;
}
