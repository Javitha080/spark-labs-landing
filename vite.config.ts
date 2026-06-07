import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";
import { cloudflare } from "@cloudflare/vite-plugin";

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
      const swPath = path.resolve(__dirname, "dist/client/sw.js");
      if (!existsSync(swPath)) {
        console.warn("[spark-sw-version] dist/client/sw.js not found — skipping");
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
      const updated = source
        .replace(/__SW_VERSION__/g, version)
        .replace(/__BUILD_TIMESTAMP__/g, String(Date.now()));
      writeFileSync(swPath, updated, "utf8");
      console.log(`[spark-sw-version] sw.js baked: ${version}`);
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
      // Content Security Policy - Allow images from external sources and MapLibre GL
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net https://ai.gateway.lovable.dev https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.instagram.com https://challenges.cloudflare.com https://ibb.co https://*.ibb.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://ibb.co https://*.ibb.co; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://ibb.co https://*.ibb.co; img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://www.googletagmanager.com https://www.instagram.com https://*.cdninstagram.com https://img.youtube.com https://*.ytimg.com https://ibb.co https://*.ibb.co https://upload.wikimedia.org https://*.unsplash.com https://images.unsplash.com https://source.unsplash.com; connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app wss://localhost:* ws://localhost:* http://localhost:* https://*.cloudflareinsights.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.ipify.org https://api64.ipify.org https://noembed.com https://api.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com https://api.lettermint.co; media-src 'self' blob: https://*.supabase.co https://*.supabase.in https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com; worker-src 'self' blob:; frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://player.vimeo.com https://challenges.cloudflare.com https://ibb.co https://*.ibb.co https://*.ytimg.com; object-src 'none'; base-uri 'self'; form-action 'self'"
    }
  },
  plugins: [
    ...(mode === "production" ? [cloudflare()] : []),
    react(),
    mode === "development" && componentTagger(),
    swVersionPlugin(),
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
            // Let Vite chunk the rest automatically to prevent circular dependency errors
          }
        },
      },
    },

    // esbuild minification (faster than terser, avoids cross-chunk issues)
    minify: 'esbuild',
  },

  // Drop console and debugger in production builds
  esbuild: mode === 'production' ? {
    drop: ['console', 'debugger'],
  } : undefined,

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
