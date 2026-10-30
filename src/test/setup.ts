import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom does not implement scrolling APIs; stub so components calling
// window.scrollTo during interactions stay noise-free (no console error).
window.scrollTo = vi.fn();

// jsdom does not implement matchMedia; GSAP ScrollTrigger calls it at plugin
// registration time, so importing any GSAP component crashes the test env.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});
