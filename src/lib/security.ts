/**
 * Security utilities for protecting against common web vulnerabilities
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes strings to prevent XSS attacks using DOMPurify
 * @param input - The string to sanitize
 * @returns Sanitized string safe for rendering
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (input == null) return '';
  return DOMPurify.sanitize(input);
}

/**
 * Creates a Content Security Policy header value.
 *
 * NOTE: This function is kept for reference only. The authoritative CSP
 * is defined server-side in src/worker/index.ts (CSP_POLICY constant) and
 * applied via HTTP headers by the Cloudflare Worker. Do NOT use this function
 * to inject a <meta> tag — that causes Lighthouse warnings and duplicates
 * the Worker's headers.
 *
 * If you update the Worker CSP, update this function to match for consistency.
 */
export function getCSPPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.instagram.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://www.googletagmanager.com https://www.instagram.com https://*.cdninstagram.com https://img.youtube.com https://*.ytimg.com https://ibb.co https://*.ibb.co https://upload.wikimedia.org",
    "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net https://grainy-gradients.vercel.app https://*.cloudflareinsights.com https://*.shutterstock.com https://*.dpdns.org https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.ipify.org https://api64.ipify.org https://noembed.com https://api.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com https://api.lettermint.co",
    "worker-src 'self' blob:",
    "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com https://challenges.cloudflare.com",
    "child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://player.vimeo.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
    "media-src 'self' blob: https://*.supabase.co https://*.supabase.in https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.instagram.com https://*.cdninstagram.com https://ibb.co https://*.ibb.co https://*.ytimg.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
}