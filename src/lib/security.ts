/**
 * Security utilities for protecting against common web vulnerabilities
 */

/**
 * Sanitizes strings to prevent XSS attacks by escaping HTML special characters
 * @param input - The string to sanitize
 * @returns Sanitized string safe for rendering
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (input == null) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates a Content Security Policy header value
 * @returns CSP header value
 */
export function getCSPPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://ai.gateway.lovable.dev",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https://*.supabase.co https://*.supabase.in blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://ai.gateway.lovable.dev",
    "frame-src 'self' https://www.google.com",
    "object-src 'none'"
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
 * Generates a random token for CSRF protection
 * @returns Random CSRF token
 */
export function generateCsrfToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
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