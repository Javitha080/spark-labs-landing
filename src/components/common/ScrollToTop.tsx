import { useState, useEffect, useSyncExternalStore } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/motion";
import { useSiteFooterInView } from "@/hooks/useSiteFooterInView";

function getChatbotSnapshot(): string {
  if (typeof document === "undefined") return "0:0";
  const ds = document.documentElement.dataset;
  return `${ds.chatbotPresent === "true" ? "1" : "0"}:${ds.chatbotOpen === "true" ? "1" : "0"}`;
}

function subscribeChatbotState(onStoreChange: () => void): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-chatbot-present", "data-chatbot-open"],
  });
  return () => observer.disconnect();
}

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);
  const chatbotSnapshot = useSyncExternalStore(
    subscribeChatbotState,
    getChatbotSnapshot,
    () => "0:0",
  );
  const hasChatbot = chatbotSnapshot[0] === "1";
  const chatbotOpen = chatbotSnapshot[2] === "1";
  const footerInView = useSiteFooterInView();
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    handleScroll();

    // Must go through lib/scroll: calling window.scrollTo directly starts a
    // native smooth animation that fights Lenis's own easing when it's active.
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && !footerInView && !chatbotOpen && (
        <m.button
          type="button"
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 260, damping: 20 }
          }
          onClick={() => scrollToTop()}
          className={
            hasChatbot
              ? "fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              : "fixed bottom-6 right-6 z-40 group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          }
          aria-label="Scroll to top"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:bg-primary/30 transition-colors" />

          {/* Button */}
          <div className="relative size-12 rounded-full bg-background/80 backdrop-blur-md border border-border/50 hover:border-primary/50 flex items-center justify-center shadow-lg hover:shadow-primary/20 transition-all duration-300 group-hover:-translate-y-0.5">
            <ArrowUp className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </m.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
