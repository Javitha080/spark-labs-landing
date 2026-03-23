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
 * Creates a Content Security Policy header value
 * @returns CSP header value
 */
export function getCSPPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' https://maps.googleapis.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://static.vecteezy.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com https://*.shutterstock.com https://www.shutterstock.com https://*.dpdns.org https://dvpyic.dpdns.org",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://static.vecteezy.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net wss://localhost:* https://cloudflareinsights.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com https://*.shutterstock.com https://www.shutterstock.com https://*.dpdns.org https://dvpyic.dpdns.org",
    "worker-src 'self' blob:",
    "frame-src 'self' https://www.google.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
    "child-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

/**
 * Validates and sanitizes URL parameters to prevent SSRF attacks
 * @param url - The URL to validate
 * @param allowedDomains - List of allowed domains
 * @returns Boolean indicating if URL is safe
 */
export function validateUrl(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsedUrl = new URL(url);

    // Check if the URL uses a safe protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // Check if domain is in allowed list (if provided)
    if (allowedDomains.length > 0) {
      return allowedDomains.some(domain =>
        parsedUrl.hostname === domain ||
        parsedUrl.hostname.endsWith(`.${domain}`)
      );
    }

    return true;
  } catch (e) {
    // Invalid URL format
    return false;
  }
}

/**
 * Generates a cryptographically secure random token for CSRF protection
 * @returns Secure CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates object IDs to prevent IDOR vulnerabilities
 * @param id - The ID to validate
 * @param pattern - Regex pattern for validation
 * @returns Boolean indicating if ID is valid
 */
export function validateId(id: string, pattern: RegExp = /^[a-zA-Z0-9_-]+$/): boolean {
  return pattern.test(id);
}