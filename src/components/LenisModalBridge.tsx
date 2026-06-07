import { useEffect } from "react";

type LenisLike = {
  stop: () => void;
  start: () => void;
};

const getLenis = (): LenisLike | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { lenis?: LenisLike }).lenis;
};

const isOpenDialog = (el: Element) => {
  const role = el.getAttribute("role");
  const state = el.getAttribute("data-state");
  return (role === "dialog" || role === "alertdialog") && state === "open";
};

/**
 * Stops the global Lenis smooth-scroll instance whenever any
 * Radix Dialog/AlertDialog is open, and restarts it when all close.
 *
 * Without this, Lenis hijacks wheel/touch events on the modal body,
 * causing the user to scroll the underlying page instead of the
 * dialog's scroll container.
 */
export default function LenisModalBridge() {
  useEffect(() => {
    let openCount = 0;
    let stoppedHere = false;

    const tryStop = () => {
      const lenis = getLenis();
      if (lenis && !stoppedHere) {
        lenis.stop();
        stoppedHere = true;
      }
    };

    const tryStart = () => {
      if (!stoppedHere) return;
      const lenis = getLenis();
      if (lenis) lenis.start();
      stoppedHere = false;
    };

    const update = () => {
      const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
      let currentOpen = 0;
      dialogs.forEach((el) => {
        if (isOpenDialog(el)) currentOpen += 1;
      });

      if (currentOpen > 0 && openCount === 0) {
        tryStop();
      } else if (currentOpen === 0 && openCount > 0) {
        tryStart();
      }
      openCount = currentOpen;
    };

    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "role"],
    });

    update();

    const retry = window.setInterval(() => {
      if (openCount > 0) tryStop();
    }, 200);

    return () => {
      window.clearInterval(retry);
      observer.disconnect();
      tryStart();
    };
  }, []);

  return null;
}
