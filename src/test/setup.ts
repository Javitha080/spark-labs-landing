import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { webcrypto } from "node:crypto";

// jsdom's crypto has no WebCrypto subtle, but worker-side modules (e.g. the
// Lettermint webhook HMAC check) exercise it in unit tests - swap in Node's
// webcrypto whenever the environment doesn't provide a usable one.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto as unknown as Crypto,
    configurable: true,
    writable: true,
  });
}

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
