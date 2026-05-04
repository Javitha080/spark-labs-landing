/**
 * Utility to sanitize image URLs from the database.
 * Some URLs (e.g. ibb.co short links) are HTML pages, not direct images.
 * Using them as <img src> causes resource.error events.
 */

const PLACEHOLDER = "/placeholder.svg";

/**
 * Returns a safe image src — replaces known non-image URLs with a placeholder.
 *
 * Known patterns:
 * - `ibb.co/XYZ` — short link to an ibb.co page (HTML), NOT a direct image.
 *   Valid direct image URLs look like `i.ibb.co/xxxxxxx/filename.ext`.
 */
export function getSafeImageSrc(
  url: string | null | undefined,
  fallback = PLACEHOLDER
): string {
  if (!url) return fallback;

  try {
    const parsed = new URL(url);

    // ibb.co short links are HTML pages, not images
    if (
      parsed.hostname === "ibb.co" &&
      !parsed.pathname.includes("/storage/") &&
      !/\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?)$/i.test(parsed.pathname)
    ) {
      return fallback;
    }
  } catch {
    // Malformed URL — return as-is, let <img> onError handle it
  }

  return url;
}
