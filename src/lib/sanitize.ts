/**
 * Shared input sanitization utilities.
 * Used across forms to prevent XSS, injection, and oversized payloads
 * before data reaches the network or database layer.
 */

/**
 * Sanitizes a plain-text input: trims whitespace, strips HTML tags,
 * and enforces an optional max length.
 */
export function sanitizeTextInput(input: string, maxLen = 1000): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[<>]/g, "")    // strip any remaining angle brackets
    .slice(0, maxLen);
}

/**
 * Sanitizes an email address: trims, lowercases, validates format.
 * Returns the sanitized email or empty string if invalid.
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";
  const cleaned = email.trim().toLowerCase().slice(0, 254);
  // RFC 5322 simplified — good enough for client-side
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : "";
}

/**
 * Sanitizes a phone number: keeps only digits, spaces, dashes, plus, and parens.
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return "";
  return phone
    .trim()
    .replace(/[^\d\s\-+()]/g, "")
    .slice(0, 20);
}

/**
 * Validates and sanitizes a URL slug: lowercase alphanumeric + hyphens only.
 * Returns null if the slug is invalid.
 */
export function sanitizeSlug(slug: string): string | null {
  if (!slug) return null;
  const cleaned = slug.trim().toLowerCase().slice(0, 200);
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(cleaned)
    ? cleaned
    : null;
}

/**
 * Validates a UUID (v4) format. Returns the trimmed UUID or null if invalid.
 */
export function sanitizeUUID(id: string): string | null {
  if (!id) return null;
  const cleaned = id.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    cleaned
  )
    ? cleaned
    : null;
}
