
import { z } from "zod";

export const blogPostSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
    slug: z.string().min(5, "Slug must be at least 5 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
    excerpt: z.string().max(300, "Excerpt must be less than 300 characters").optional().nullable(),
    content: z.string().min(50, "Content must be at least 50 characters"),
    author_name: z.string().min(2, "Author name is required"),
    author_image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    cover_image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    category: z.string().min(1, "Category is required"),
    tags: z.string().optional(), // We'll handle CSV parsing in the component
    tech_stack: z.string().optional(),
    status: z.enum(["draft", "in_review", "published"]),
    is_featured: z.boolean().default(false),
});

export type BlogPostFormValues = z.infer<typeof blogPostSchema>;
