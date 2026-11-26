import { defineConfig, transformWithEsbuild, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
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
// It also bakes a `__PRECACHE_MANIFEST__` list of every hashed JS/CSS chunk
// so the SW precaches the complete app at install time instead of only the
// top-level assets referenced by index.html (the gap that made lazy route
// chunks fail with 408/Offline on first-ever offline visits).

// Walk dist/…/assets and return "/assets/…" URLs (plus total bytes) for every
// hashed JS/CSS chunk. Fonts are runtime-cached — precaching every latin/
// cyrillic/greek subset would waste mobile data — and images keep their
// stale-while-revalidate entry budget as before.
const PRECACHE_EXCLUDE_RE =
  /^(AdminLayout|AdminLogin|Analytics|ActivityLog|ProfileSettings|BlogManager|BlogEditor|RichTextEditor|DashboardCharts|.*Manager|.*Tab|vendor-editor|vendor-charts|vendor-maps|vendor-three|Map|maplibre-gl-worker|TiltShiftDiorama|DioramaShowcase|Fur)-/;

function collectPrecacheAssets(assetsDir: string, clientRoot: string): { urls: string[]; bytes: number } {
  const urls: string[] = [];
  let bytes = 0;
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(js|css)$/.test(entry.name)) continue;
      if (PRECACHE_EXCLUDE_RE.test(entry.name)) continue;
      const rel = path.relative(clientRoot, full).split(path.sep).join("/");
      urls.push(`/${rel}`);
      try {
        bytes += statSync(full).size;
      } catch {
        /* file vanished mid-walk */
      }
    }
  };
  walk(assetsDir);
  urls.sort();
  return { urls, bytes };
}

function swVersionPlugin(): Plugin {
  return {
    name: "spark-sw-version",
    apply: "build",
    enforce: "post",
    closeBundle() {
      // Inject build-time CSP into dist/_headers from single source of truth
      const headersPaths = [
        path.resolve(__dirname, "dist/client/_headers"),
        path.resolve(__dirname, "dist/_headers"),
      ];
      for (const headersPath of headersPaths) {
        if (existsSync(headersPath)) {
          const headersSrc = readFileSync(headersPath, "utf8");
          if (headersSrc.includes("__CSP_POLICY__")) {
            writeFileSync(
              headersPath,
              headersSrc.replace(/__CSP_POLICY__/g, buildCSPPolicy()),
              "utf8"
            );
          }
        }
      }

      // Inject <link rel="modulepreload"> for core animation vendor chunks inside
      // BOT-STRIP-START:react so real visitors parallelize GSAP + Framer Motion
      // on frame 0 while bot prerender continues to strip all app scripts cleanly.
      const htmlPaths = [
        path.resolve(__dirname, "dist/client/index.html"),
        path.resolve(__dirname, "dist/index.html"),
      ];
      for (const htmlPath of htmlPaths) {
        if (!existsSync(htmlPath)) continue;
        const assetsFolder = path.join(path.dirname(htmlPath), "assets");
        if (!existsSync(assetsFolder)) continue;
        const htmlSrc = readFileSync(htmlPath, "utf8");
        const animVendors = readdirSync(assetsFolder).filter((f) =>
          /^vendor-(gsap|motion)-[a-zA-Z0-9_-]+\.js$/.test(f)
        );
        const preloadLinks = animVendors
          .filter((f) => !htmlSrc.includes(`/assets/${f}`))
          .map((f) => `  <link rel="modulepreload" crossorigin href="/assets/${f}">`)
          .join("\n");
        if (preloadLinks && htmlSrc.includes("<!-- BOT-STRIP-START:react -->")) {
          writeFileSync(
            htmlPath,
            htmlSrc.replace(
              "<!-- BOT-STRIP-START:react -->",
              `<!-- BOT-STRIP-START:react -->\n${preloadLinks}`
            ),
            "utf8"
          );
        }
      }

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

      const clientRoot = path.dirname(swPath);
      const precache = collectPrecacheAssets(path.join(clientRoot, "assets"), clientRoot);

      const source = readFileSync(swPath, "utf8");

      // Only log if we're actually injecting it for the first time in this file
      if (source.includes("__SW_VERSION__") || source.includes("__PRECACHE_MANIFEST__")) {
        const updated = source
          .replace(/__SW_VERSION__/g, version)
          .replace(/__BUILD_TIMESTAMP__/g, String(Date.now()))
          .replace(/__PRECACHE_MANIFEST__/g, JSON.stringify(precache.urls));
        writeFileSync(swPath, updated, "utf8");
        const mb = (precache.bytes / 1048576).toFixed(1);
        console.log(`[spark-sw-version] sw.js baked: ${version} (precache: ${precache.urls.length} assets, ~${mb} MB)`);
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
    ...(mode === "production" && process.env.SKIP_CLOUDFLARE !== "1" ? [cloudflare()] : []),
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
          if (!id.includes('node_modules')) return undefined;

          // Match on exact package directories. The previous rule used
          // `id.includes('react')`, which swept every package with "react" in
          // its name (react-hook-form, react-dropzone, lucide-react, every
          // @radix-ui/react-*, @tanstack/react-query...) into ONE ~650 kB chunk
          // that the landing page had to download and parse up front, and made
          // the vendor-radix rule below it unreachable.
          const inPkg = (...names: string[]) =>
            names.some((n) => id.includes(`/node_modules/${n}/`));

          // Shared UI class utilities needed by almost every route. Matched before
          // vendor-editor / vendor-charts so Rollup never hoists clsx (used by
          // recharts) into an excluded lazy chunk that breaks SW offline precaching.
          if (inPkg('clsx', 'tailwind-merge', 'class-variance-authority')) {
            return 'vendor-react';
          }

          // Tiptap editor (admin BlogEditor only). Checked before vendor-react so that
          // @tiptap/react stays with the rest of the editor and the only
          // chunk edge is vendor-editor -> vendor-react (no circular warning).
          if (id.includes('/node_modules/@tiptap/')) return 'vendor-editor';

          // Charts (admin Analytics / DashboardCharts only). Checked before
          // vendor-react so recharts -> react stays one-way with zero circular warning.
          if (
            id.includes('/node_modules/recharts/') ||
            id.includes('/node_modules/victory-vendor/') ||
            id.includes('/node_modules/d3-')
          ) {
            return 'vendor-charts';
          }

          // React core: needed by every route.
          if (inPkg('react', 'react-dom', 'scheduler')) return 'vendor-react';

          // Router: needed by every route, but versioned independently.
          if (inPkg('react-router', 'react-router-dom', '@remix-run/router', 'cookie', 'set-cookie-parser')) {
            return 'vendor-router';
          }

          // Animation libraries - each one cached independently.
          if (inPkg('framer-motion', 'motion-dom', 'motion-utils')) return 'vendor-motion';
          if (id.includes('/node_modules/gsap/') || id.includes('/node_modules/@gsap/')) return 'vendor-gsap';

          // Data layer
          if (id.includes('/node_modules/@supabase/') || inPkg('iceberg-js')) return 'vendor-supabase';
          if (id.includes('/node_modules/@tanstack/')) return 'vendor-query';

          // Forms / validation / uploads (admin + login flows)
          if (
            inPkg('react-hook-form', 'zod', 'react-dropzone', 'file-selector', 'attr-accept') ||
            id.includes('/node_modules/@hookform/')
          ) {
            return 'vendor-forms';
          }

          // Liquid Glass WebGL effects
          if (id.includes('/node_modules/@ybouane/')) return 'vendor-liquidglass';

          // Maps (optional location map)
          if (id.includes('/node_modules/maplibre-gl/')) return 'vendor-maps';

          // Let Rollup chunk the rest automatically to avoid circular chunks.
          return undefined;
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
