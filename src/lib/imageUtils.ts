/**
 * Utility to sanitize image URLs from the database.
 * Some URLs (e.g. ibb.co short links) are HTML pages, not direct images.
 * Using them as <img src> causes resource.error events.
 */

const PLACEHOLDER = "/placeholder.svg";

/**
 * Returns a safe image src - replaces known non-image URLs with a placeholder.
 *
 * Known patterns:
 * - `ibb.co/XYZ` - short link to an ibb.co page (HTML), NOT a direct image.
 *   Valid direct image URLs look like `i.ibb.co/xxxxxxx/filename.ext`.
 */
export function getSafeImageSrc(
  url: string | null | undefined,
  fallback = PLACEHOLDER
): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  // eslint-disable-next-line no-control-regex
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;

  // Allow safe root-relative paths (but block protocol-relative // and /\).
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
    return trimmed;
  }

  // Allow blob: URLs and non-SVG data:image/* raster URIs (block data:image/svg+xml & data:text/html).
  if (/^blob:/i.test(trimmed)) return trimmed;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return fallback;
    }

    // ibb.co short links are HTML pages, not images
    if (
      parsed.hostname === "ibb.co" &&
      !parsed.pathname.includes("/storage/") &&
      !/\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?)$/i.test(parsed.pathname)
    ) {
      return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}
