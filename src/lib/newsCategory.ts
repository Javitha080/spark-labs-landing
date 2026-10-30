/**
 * News posts live on the dedicated /news page and are excluded from the blog
 * listing. Both surfaces agree on membership through this helper so the only
 * thing authors do differently is pick the "News" category in the CMS.
 */
export const NEWS_CATEGORY = "News";

export function isNewsCategory(category: string | null | undefined): boolean {
  return (category ?? "").trim().toLowerCase() === NEWS_CATEGORY.toLowerCase();
}
