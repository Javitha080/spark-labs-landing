/**
 * SSRF (Server-Side Request Forgery) Protection Utilities
 * 
 * This module provides functions to prevent SSRF attacks by validating
 * URLs and implementing proper access controls for network requests.
 */

/**
 * List of allowed domains for external requests
 * Add your trusted domains here
 */
const ALLOWED_DOMAINS = [
  'supabase.co',
  'supabase.in',
  'lovable.dev',
  'googleapis.com',
  'gstatic.com'
];

/**
 * Validates if a URL is safe to make requests to
 * @param url - The URL to validate
 * @returns Boolean indicating if URL is safe
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Check if protocol is safe
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Prevent requests to private IP ranges
    const hostname = parsedUrl.hostname;
    
    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }
    
    // Block private IP ranges
    if (isPrivateIP(hostname)) {
      return false;
    }
    
    // Check against allowed domains
    return ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch (e) {
    // Invalid URL format
    return false;
  }
}

/**
 * Checks if an IP address is in a private range
 * @param ip - The IP address to check
 * @returns Boolean indicating if IP is private
 */
function isPrivateIP(ip: string): boolean {
  // Simple check for common private IP ranges
  return /^10\./.test(ip) || 
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) || 
         /^192\.168\./.test(ip) ||
         /^169\.254\./.test(ip) ||
         /^fd/.test(ip) || // IPv6 private
         /^fc/.test(ip);   // IPv6 private
}

/**
 * Creates a proxy request with proper validation
 * @param url - The URL to request
 * @param options - Request options
 * @returns Promise with response or error
 */
export async function safeRequest(url: string, options: RequestInit = {}): Promise<Response> {
  if (!isSafeUrl(url)) {
    throw new Error('URL validation failed: Potential SSRF attack');
  }
  
  // Proceed with the request
  return fetch(url, {
    ...options,
    // Add additional security headers
    headers: {
      ...options.headers,
      'X-Requested-By': 'spark-labs-application'
    }
  });
}