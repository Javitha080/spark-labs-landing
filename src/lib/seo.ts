export const SITE_URL = "https://dvpyic.dpdns.org";
export const SITE_NAME = "Young Innovators Club";
export const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/EkOl1g2fgzZeJ2pzIbADUxhR0i63/social-images/social-1767110197391-logo-8bCvVNjY.png";

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

export function getSEOTitle(pageTitle: string): string {
  return `${pageTitle} | ${SITE_NAME}`;
}
