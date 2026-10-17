import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom does not implement scrolling APIs; stub so components calling
// window.scrollTo during interactions stay noise-free (no console error).
window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
});
