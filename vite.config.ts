import { defineConfig, transformWithEsbuild, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";
import { cloudflare } from "@cloudflare/vite-plugin";
import { buildCSPPolicy } from "./src/lib/cspPolicy";

/**
 * Strip console/debugger from CLIENT output only.
 *
 * The `esbuild.drop` option is global: it applies to every Vite environment,
 * including the Cloudflare Worker. In production that silently removed every
 * console.log/error call from the deployed Worker - verified by the absence of
 * the `[email-queue]` and `[edge-cache]` strings in the built worker bundle
 * while `cached_json` from the same module survived - so Workers Logs had no
 * application output at all. Running the drop per module for the client
 * environment keeps the client bundle clean and the Worker observable.
 */
function dropClientConsole(): Plugin {
  return {
    name: "drop-client-console",
    apply: "build",
    enforce: "post",
    async transform(code, id) {
      if (this.environment.name !== "client") return null;
      if (!/\bconsole\.(log|info|debug|warn|error|trace)\s*\(/.test(code)) return null;
      const result = await transformWithEsbuild(code, id, {
        drop: ["console", "debugger"],
      });
      return { code: result.code, map: null };
    },
  };
}

// ─── Service Worker version injection ────────────────────────────────────────
// public/sw.js contains a `__SW_VERSION__` placeholder. After Vite copies the
// public/ folder to dist/client/, this plugin replaces the placeholder with a
// unique build identifier so the browser detects a new SW on every deploy.
function swVersionPlugin(): Plugin {
  return {
    name: "spark-sw-version",
    apply: "build",
    enforce: "post",
    closeBundle() {
      // Check both possible output directories (Vite default vs Cloudflare plugin)
      const swPaths = [
        path.resolve(__dirname, "dist/client/sw.js"),
        path.resolve(__dirname, "dist/sw.js"),
      ];
      
      const swPath = swPaths.find(p => existsSync(p));

      if (!swPath) {
        // Suppress warning - this often runs during wrangler's internal worker build 
        // or secondary passes where the client sw.js is not present or relevant.
        return;
      }

      const ts = Date.now().toString(36);
      let sha = "nogit";
      try {
        sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
          .toString()
          .trim();
      } catch {
        /* not a git repo / git unavailable */
      }
      const version = `${ts}-${sha}`;
      const source = readFileSync(swPath, "utf8");

      // Only log if we're actually injecting it for the first time in this file
      if (source.includes('__SW_VERSION__')) {
        const updated = source
          .replace(/__SW_VERSION__/g, version)
          .replace(/__BUILD_TIMESTAMP__/g, String(Date.now()));
        writeFileSync(swPath, updated, "utf8");
        console.log(`[spark-sw-version] sw.js baked: ${version}`);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // No manual proxies needed — the cloudflare() plugin integrates the Worker
    // into Vite's dev server, so all /api/* routes are handled by the Worker
    // (including /api/upload-media and /api/ig-oembed).
    headers: {
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      // Content Security Policy — single source of truth in src/lib/cspPolicy.ts;
      // dev mode adds localhost allowances for HMR and tags external origins.
      'Content-Security-Policy': buildCSPPolicy({ dev: true })
    }
  },
  plugins: [
    // The Cloudflare plugin's build writes the Worker bundle to
    // dist/spark_labs_landing/ and copies the local .dev.vars file next to it
    // (Vite prints "Using secrets defined in .dev.vars"). That copy stays in
    // the server output directory only: the deployed asset directory is
    // dist/client, which never receives it, and wrangler uploads secrets only
    // via `wrangler secret put`. Never add .dev.vars to public/ or dist/client.
    ...(mode === "production" ? [cloudflare()] : []),
    react(),
    mode === "development" && componentTagger(),
    swVersionPlugin(),
    dropClientConsole(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ─── Production Build Optimizations ───
  build: {
    // Disable source maps in production (security + smaller deploy)
    sourcemap: mode === "development",

    // Chunk size warning threshold
    chunkSizeWarningLimit: 500,

    // Enable CSS code splitting
    cssCodeSplit: true,

    // Target modern browsers for smaller output
    target: 'es2020',

    // Rollup options for optimal code splitting
    rollupOptions: {
      output: {
        // Hashed filenames for long-term caching on Cloudflare CDN
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',

        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Tiptap editor (admin BlogEditor only). MUST be checked before the
            // broad /react/ test below: @tiptap/react lives in this chunk, so
            // keeping all of @tiptap together while React core stays in
            // vendor-react gives a one-way edge (vendor-editor -> vendor-react)
            // instead of the circular chunk warning.
            if (id.includes('@tiptap')) {
              return 'vendor-editor';
            }
            // Core React vendors
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Framer Motion
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            // Supabase client
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // GSAP animation library
            if (id.includes('gsap') || id.includes('@gsap')) {
              return 'vendor-gsap';
            }
            // Liquid Glass WebGL effects
            if (id.includes('@ybouane/liquidglass') || id.includes('liquidglass')) {
              return 'vendor-liquidglass';
            }
            // Three.js + tiltshift diorama (lazy, hero only)
            if (id.includes('three') || id.includes('tiltshift-in-html')) {
              return 'vendor-three';
            }
            // Let Vite chunk the rest automatically to prevent circular dependency errors
          }
        },
      },
    },

    // esbuild minification (faster than terser, avoids cross-chunk issues)
    minify: 'esbuild',
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
}));
