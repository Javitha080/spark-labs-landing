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

// jsdom does not implement scrolling APIs or matchMedia; stub them when running
// in a browser-like test environment (skipped for node-env worker suites).
if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();

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
}

afterEach(() => {
  cleanup();
});
