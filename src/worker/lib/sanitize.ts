import sanitizeHtml from "sanitize-html";

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * Strip every HTML tag from user text while preserving literal characters
 * like "&" instead of leaving HTML-encoded entities in storage.
 */
export const stripHtml = (value: string): string =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITY_MAP[m] ?? m)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

/** Escape text for safe interpolation into an HTML email/template. */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));

/** Escape text for safe interpolation into XML documents (sitemaps, RSS). */
export const escXml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch] as string));

/** Single-line version for e-mail subjects / names / XML fields (prevents CRLF injection & illegal XML 1.0 control chars). */
export const singleLine = (value: string, max = 120): string =>
  value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, max);

export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
export const isValidEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const BLOG_SLUG_RE = /^[a-zA-Z0-9._~-]{1,200}$/;
export const ENTITY_UUID_RE = UUID_RE;
export const ENTITY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const INSTRUCTOR_SLUG_RE = ENTITY_SLUG_RE;

export const sanitizeObject = (obj: unknown): unknown => {
  if (typeof obj === "string") return stripHtml(obj);
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
};
