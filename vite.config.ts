import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { cloudflare } from "@cloudflare/vite-plugin";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      // Content Security Policy - Allow images from external sources and MapLibre GL
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net https://ai.gateway.lovable.dev https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://static.vecteezy.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com; connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://static.vecteezy.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app wss://localhost:* https://cloudflareinsights.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com; worker-src 'self' blob:; frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'"
    }
  },
  plugins: [
    ...(mode === "production" ? [cloudflare()] : []),
    react(),
    mode === "development" && componentTagger()
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
            if (id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')) {
              return 'vendor-react';
            }

            // UI library chunks - Radix UI
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }

            // Animation library
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }

            // Data fetching
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }

            // Date utilities
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }

            // Form handling
            if (id.includes('react-hook-form') ||
              id.includes('zod') ||
              id.includes('@hookform/resolvers')) {
              return 'vendor-forms';
            }

            // Map library
            if (id.includes('maplibre-gl')) {
              return 'vendor-map';
            }

            // Rich text editor
            if (id.includes('@tiptap') || id.includes('lowlight')) {
              return 'vendor-editor';
            }

            // Icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
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
      'framer-motion',
      '@tanstack/react-query',
      'date-fns',
    ],
  },
}));
