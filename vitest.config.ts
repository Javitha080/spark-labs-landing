import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Reuse one jsdom per worker thread (keeps per-file isolation) — creates
    // the environment 4× per run otherwise, ~60% of total duration on Windows.
    pool: "vmThreads",
  },
});
