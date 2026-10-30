import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "@/lib/scroll";

/**
 * Desktop scroll-to-top control reading pages.
 *
 * Mobile keeps the two existing floating controls (TOC + reading preferences),
 * so this is deliberately desktop-only and moves to the free bottom-left slot.
 * Appears only after the reader has scrolled well past the article header.
 */
export default function BackToTop({ threshold = 720 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      setVisible(window.scrollY > threshold);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 left-6 z-40 hidden lg:block"
        >
          <button
            type="button"
            onClick={() => scrollToTop()}
            aria-label="Back to top"
            className="group flex items-center gap-2 rounded-full border border-border/60 bg-background/80 backdrop-blur-md pl-3 pr-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-lg transition-all hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
          >
            <ArrowUp className="size-4 transition-transform group-hover:-translate-y-0.5" />
            Top
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
