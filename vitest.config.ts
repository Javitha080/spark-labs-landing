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
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://test.supabase.co",
      VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID || "test",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_test_key",
    },
    server: {
      deps: {
        inline: [
          "sanitize-html",
          "htmlparser2",
          "domhandler",
          "domutils",
          "domelementtype",
          "entities",
        ],
      },
    },
    // Use native worker_threads instead of vmThreads: Node's vm realm breaks
    // require(esm) for CJS sanitize-html -> ESM htmlparser2@12 and ignores
    // server.deps.inline on Linux CI.
    pool: "threads",
  },
});
