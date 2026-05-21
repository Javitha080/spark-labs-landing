/**
 * SSRF (Server-Side Request Forgery) Protection Utilities
 * Used by the Worker to validate external URLs before making requests.
 */

const ALLOWED_DOMAINS = [
  'supabase.co',
  'supabase.in',
  'lovable.dev',
  'googleapis.com',
  'gstatic.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'tinkercad.com',
  'autodesk.com',
  'github.com',
  'raw.githubusercontent.com',
  'codepen.io',
  'jsfiddle.net',
  'maps.google.com',
  'www.google.com',
  'openstreetmap.org',
  'tile.openstreetmap.org',
  'noembed.com',
  'api.instagram.com',
  'cdninstagram.com',
  'ibb.co',
  'ytimg.com',
  'lettermint.co',
];

export function isSafeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false;
    const hostname = parsedUrl.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    if (isPrivateIP(hostname)) return false;
    return ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

function isPrivateIP(ip: string): boolean {
  return /^10\./.test(ip) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^fd/.test(ip) ||
    /^fc/.test(ip);
}
