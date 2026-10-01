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
  'gstatic.com',
  'instagram.com',
  'cdninstagram.com',
  'graph.instagram.com',
  'noembed.com'
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
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
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
  // URL.hostname wraps IPv6 literals in brackets: "[::1]"
  const host = ip.replace(/^\[|\]$/g, '').toLowerCase();

  // IPv4 (incl. the whole 127/8 loopback block, 0.0.0.0/8 and CGNAT 100.64/10 –
  // the previous regexes only caught 10/8, 172.16/12, 192.168/16 and 169.254/16)
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  // IPv6: loopback, unspecified, unique-local (fc00::/7), link-local (fe80::/10),
  // and IPv4-mapped addresses (::ffff:127.0.0.1)
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host);
    if (mapped) return isPrivateIP(mapped[1]);
  }
  return false;
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