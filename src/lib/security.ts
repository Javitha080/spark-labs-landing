/**
 * Security utilities for protecting against common web vulnerabilities
 */

import DOMPurify from 'dompurify';
import { buildCSPPolicy } from './cspPolicy';

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
 * The authoritative policy lives in src/lib/cspPolicy.ts (single source of
 * truth, also used by the Worker and the Vite dev server). Do NOT inject a
 * <meta> tag with it - that causes Lighthouse warnings and duplicates the
 * Worker's headers.
 */
export function getCSPPolicy(): string {
  return buildCSPPolicy();
}