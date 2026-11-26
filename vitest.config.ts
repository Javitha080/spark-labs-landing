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
        inline: ["sanitize-html", "htmlparser2"],
      },
    },
    // Reuse one jsdom per worker thread (keeps per-file isolation) — creates
    // the environment 4× per run otherwise, ~60% of total duration on Windows.
    pool: "vmThreads",
  },
});
