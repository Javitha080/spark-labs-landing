/**
 * Single source of truth for the site's Content Security Policy.
 *
 * Consumers:
 *  - src/worker/index.ts   → production response headers (authoritative)
 *  - src/lib/security.ts   → getCSPPolicy() helper re-exports this
 *  - vite.config.ts        → dev-server headers (plus local HMR allowances)
 *
 * When the policy changes, edit THIS FILE only. `unsafe-eval` is
 * intentionally absent: no runtime dependency in the bundle performs dynamic
 * JS evaluation (checked against three / maplibre-gl / gsap / framer-motion /
 * recharts / tiptap / animejs). `wasm-unsafe-eval` stays narrowly allowed for
 * WebGL-adjacent decoders (e.g. three's optional basis/draco transcoders).
 */

// The production policy enforced by the Worker on every HTML/API response.
export const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.instagram.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://www.googletagmanager.com https://www.instagram.com https://*.cdninstagram.com https://img.youtube.com https://*.ytimg.com https://ibb.co https://*.ibb.co https://upload.wikimedia.org https://*.unsplash.com https://images.unsplash.com https://source.unsplash.com",
  "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://*.cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://noembed.com https://api.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com",
  "child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "media-src 'self' blob: https://*.supabase.co https://*.supabase.in https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
];

/**
 * Build the CSP header value.
 *
 * `dev` relaxes exactly what a local Vite session needs (HMR websockets and
 * the Lovable AI gateway) and must never be enabled in production.
 */
export function buildCSPPolicy({ dev = false }: { dev?: boolean } = {}): string {
  if (!dev) return CSP_DIRECTIVES.join("; ");

  return CSP_DIRECTIVES.map((directive) => {
    if (directive.startsWith("connect-src ")) {
      return `${directive} wss://localhost:* ws://localhost:* http://localhost:*`;
    }
    if (directive.startsWith("script-src ")) {
      return `${directive} https://ai.gateway.lovable.dev`;
    }
    return directive;
  }).join("; ");
}
