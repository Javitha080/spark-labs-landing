import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollToTop } from "@/lib/scroll";

export function RouteAnnouncer() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const isFirstRenderRef = useRef(true);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return undefined;
    }

    if (navigationType === "PUSH" && !hash) {
      scrollToTop({ immediate: true });
    }

    const timer = window.setTimeout(() => {
      const heading = document.querySelector("h1")?.textContent?.trim();
      const label = document.title?.trim() || heading || pathname;
      setAnnouncement(`Navigated to ${label}`);

      if (!hash && document.activeElement === document.body) {
        const main =
          document.getElementById("main-content") ??
          document.querySelector<HTMLElement>("main");
        if (main) {
          if (!main.hasAttribute("tabindex")) {
            main.setAttribute("tabindex", "-1");
          }
          main.focus({ preventScroll: true });
        }
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [pathname, hash, navigationType]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

export default RouteAnnouncer;
