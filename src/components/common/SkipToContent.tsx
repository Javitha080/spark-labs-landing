import type { MouseEvent } from "react";
import { scrollToTarget } from "@/lib/scroll";

export function SkipToContent() {
  const handleSkip = (e: MouseEvent<HTMLAnchorElement>) => {
    const target =
      document.getElementById("main-content") ??
      document.querySelector<HTMLElement>("main");
    if (!target) return;

    e.preventDefault();
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
    scrollToTarget(target);
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100001] focus:inline-flex focus:items-center focus:rounded-full focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}

export default SkipToContent;
