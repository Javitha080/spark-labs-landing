import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Copy, MessageCircle, Twitter, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  html: string;
  proseRef: RefObject<HTMLDivElement | null>;
  focus: boolean;
  ruler: boolean;
}

interface Selection {
  x: number;
  y: number;
  text: string;
}

/**
 * Renders the sanitised article HTML and layers reading features on top:
 * copy buttons on code, copyable heading anchors, image lightbox,
 * select-to-share, a real focus mode and a reading ruler.
 */
export default function ArticleBody({ html, proseRef, focus, ruler }: Props) {
  const markup = useMemo(() => ({ __html: html }), [html]);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);

  /* 1 ─ code copy buttons + heading anchors (idempotent) */
  useEffect(() => {
    const root = proseRef.current;
    if (!root) return;

    root.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".code-copy-btn")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-btn";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      btn.addEventListener("click", async () => {
        const text = pre.querySelector("code")?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied ✓";
          btn.dataset.done = "1";
          toast.success("Code copied");
          setTimeout(() => {
            btn.textContent = "Copy";
            delete btn.dataset.done;
          }, 1600);
        } catch {
          toast.error("Couldn't copy the code");
        }
      });
      pre.appendChild(btn);
    });

    root.querySelectorAll<HTMLElement>("h2[id], h3[id], h4[id]").forEach((h) => {
      if (h.querySelector(".rs-anchor")) return;
      const a = document.createElement("button");
      a.type = "button";
      a.className = "rs-anchor";
      a.textContent = "#";
      a.setAttribute("aria-label", `Copy link to section: ${h.textContent}`);
      a.addEventListener("click", async () => {
        const link = `${location.origin}${location.pathname}#${h.id}`;
        history.replaceState(null, "", `#${h.id}`);
        try {
          await navigator.clipboard.writeText(link);
          toast.success("Section link copied");
        } catch {
          /* clipboard blocked */
        }
      });
      h.appendChild(a);
    });
  }, [html, proseRef]);

  /* 2 ─ image lightbox (linked images keep following their link) */
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = (e.target as HTMLElement).closest("img");
    if (!img || img.closest("a")) return;
    const src = img.getAttribute("src");
    if (src) setLightbox({ src, alt: img.getAttribute("alt") ?? "" });
  };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  /* 3 ─ focus mode: highlight the block nearest the reading line */
  useEffect(() => {
    const root = proseRef.current;
    if (!root) return;
    const clear = () => root.querySelectorAll(".is-focus").forEach((el) => el.classList.remove("is-focus"));
    if (!focus) {
      clear();
      return;
    }
    let raf = 0;
    const update = () => {
      const line = window.innerHeight * 0.42;
      let best: Element | null = null;
      let bestDist = Infinity;
      for (const child of Array.from(root.children)) {
        const r = child.getBoundingClientRect();
        const dist = r.top <= line && r.bottom >= line ? 0 : Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line));
        if (dist < bestDist) {
          bestDist = dist;
          best = child;
        }
      }
      clear();
      best?.classList.add("is-focus");
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clear();
    };
  }, [focus, proseRef]);

  /* 4 ─ reading ruler follows the pointer while it is over the article */
  useEffect(() => {
    const el = rulerRef.current;
    const root = proseRef.current;
    if (!ruler || !el || !root) return;
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const inside = e.clientX >= r.left - 40 && e.clientX <= r.right + 40 && r.top < window.innerHeight && r.bottom > 0;
      el.style.opacity = inside ? "1" : "0";
      el.style.top = `${e.clientY - el.offsetHeight / 2}px`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [ruler, proseRef]);

  /* 5 ─ select-to-share */
  useEffect(() => {
    const root = proseRef.current;
    if (!root) return;
    const onSel = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || s.rangeCount === 0) return setSel(null);
      const text = s.toString().trim();
      const range = s.getRangeAt(0);
      if (text.length < 12 || !root.contains(range.commonAncestorContainer)) return setSel(null);
      const r = range.getBoundingClientRect();
      setSel({ x: r.left + r.width / 2, y: r.top, text });
    };
    const hide = () => setSel(null);
    document.addEventListener("selectionchange", onSel);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      document.removeEventListener("selectionchange", onSel);
      window.removeEventListener("scroll", hide);
    };
  }, [proseRef]);

  const quote = sel ? `“${sel.text.length > 220 ? sel.text.slice(0, 217) + "…" : sel.text}”` : "";
  const pageUrl = () => `${location.origin}${location.pathname}`;

  return (
    <>
      <div
        ref={proseRef}
        className="rs-prose"
        onClick={onClick}
        // Content is sanitised in lib/blog-content.ts before it reaches this component.
        dangerouslySetInnerHTML={markup}
      />

      {ruler && <div ref={rulerRef} className="rs-ruler" style={{ opacity: 0, top: -200 }} aria-hidden />}

      <AnimatePresence>
        {sel && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            style={{ left: Math.min(Math.max(sel.x, 110), window.innerWidth - 110), top: Math.max(sel.y - 54, 70) }}
            className="fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-neutral-900 p-1 text-white shadow-2xl ring-1 ring-white/10"
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium hover:bg-white/10"
              onClick={async () => {
                await navigator.clipboard.writeText(`${quote} — ${pageUrl()}`).catch(() => undefined);
                toast.success("Quote copied");
                setSel(null);
              }}
            >
              <Copy className="size-3.5" /> Copy quote
            </button>
            <button
              type="button"
              aria-label="Share quote on X"
              className="grid size-8 place-items-center rounded-full hover:bg-white/10"
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(quote)}&url=${encodeURIComponent(pageUrl())}`, "_blank", "noopener,noreferrer")}
            >
              <Twitter className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Share quote on WhatsApp"
              className="grid size-8 place-items-center rounded-full hover:bg-white/10"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${quote} ${pageUrl()}`)}`, "_blank", "noopener,noreferrer")}
            >
              <MessageCircle className="size-3.5" />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <m.div
            className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label={lightbox.alt || "Image preview"}
          >
            <button
              type="button"
              aria-label="Close image"
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setLightbox(null)}
            >
              <X className="size-5" />
            </button>
            <m.img
              src={lightbox.src}
              alt={lightbox.alt}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
