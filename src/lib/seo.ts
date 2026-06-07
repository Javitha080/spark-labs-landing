export const SITE_URL = "https://dvpyic.dpdns.org";
export const SITE_NAME = "Young Innovators Club";
export const DEFAULT_OG_IMAGE = "https://dvpyic.dpdns.org/club-logo.png";
export const DEFAULT_OG_IMAGE_ALT = "Young Innovators Club logo";

export interface SEOProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  ogType?: "website" | "article";
  article?: {
    publishedTime?: string;
    author?: string;
    tags?: string[];
  };
  noindex?: boolean;
}

/** Brand suffix used for page titles. Short to keep within 60 chars. */
export const TITLE_SUFFIX = " | YICDVP";
export const MAX_TITLE_LENGTH = 60;

/** Build a SEO title that stays under 60 chars. Truncates the page name first, keeps brand suffix. */
export function getSEOTitle(pageTitle: string): string {
  const suffix = TITLE_SUFFIX;
  const available = MAX_TITLE_LENGTH - suffix.length;
  const trimmed = pageTitle.trim();
  if (trimmed.length <= available) return `${trimmed}${suffix}`;
  // Truncate at last space within budget, leave room for ellipsis
  const sliced = trimmed.slice(0, available - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const head = lastSpace > available * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${head}…${suffix}`;
}
