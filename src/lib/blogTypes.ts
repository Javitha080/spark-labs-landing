/**
 * Post shapes shared by the blog listing and the article reading system.
 * Field names intentionally mirror the `blog_posts` columns (snake_case) so
 * Supabase / edge-cache rows flow through without a mapping layer.
 */
export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author_name: string;
  author_image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  is_featured: boolean;
  views: number;
}

export const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "popular", label: "Most read" },
  { key: "quick", label: "Quick reads" },
  { key: "oldest", label: "Oldest" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

export const isSortKey = (v: unknown): v is SortKey =>
  typeof v === "string" && SORTS.some((s) => s.key === v);
