import { z } from "zod";

// Maximum content length to prevent DoS via oversized content
const MAX_CONTENT_LENGTH = 50000; // ~50KB
const MAX_TITLE_LENGTH = 100;
const MAX_EXCERPT_LENGTH = 300;
const MAX_AUTHOR_NAME_LENGTH = 100;
const MAX_TAGS_LENGTH = 500;
const MAX_TECH_STACK_LENGTH = 500;

export const blogPostSchema = z.object({
    title: z.string()
        .min(5, "Title must be at least 5 characters")
        .max(MAX_TITLE_LENGTH, `Title must be less than ${MAX_TITLE_LENGTH} characters`),
    
    slug: z.string()
        .min(5, "Slug must be at least 5 characters")
        .max(100, "Slug must be less than 100 characters")
        .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
    
    excerpt: z.string()
        .max(MAX_EXCERPT_LENGTH, `Excerpt must be less than ${MAX_EXCERPT_LENGTH} characters`)
        .optional()
        .nullable(),
    
    content: z.string()
        .min(50, "Content must be at least 50 characters")
        .max(MAX_CONTENT_LENGTH, `Content must be less than ${MAX_CONTENT_LENGTH} characters (${Math.round(MAX_CONTENT_LENGTH/1000)}KB)`),
    
    author_name: z.string()
        .min(2, "Author name is required")
        .max(MAX_AUTHOR_NAME_LENGTH, `Author name must be less than ${MAX_AUTHOR_NAME_LENGTH} characters`),
    
    author_image_url: z.string()
        .url("Must be a valid URL")
        .max(500, "URL is too long")
        .optional()
        .or(z.literal("")),
    
    cover_image_url: z.string()
        .url("Must be a valid URL")
        .max(500, "URL is too long")
        .optional()
        .or(z.literal("")),
    
    category: z.string()
        .min(1, "Category is required")
        .max(50, "Category must be less than 50 characters"),
    
    tags: z.string()
        .max(MAX_TAGS_LENGTH, `Tags must be less than ${MAX_TAGS_LENGTH} characters`)
        .optional(), // We'll handle CSV parsing in the component
    
    tech_stack: z.string()
        .max(MAX_TECH_STACK_LENGTH, `Tech stack must be less than ${MAX_TECH_STACK_LENGTH} characters`)
        .optional(),
    
    status: z.enum(["draft", "in_review", "published"]),
    
    is_featured: z.boolean().default(false),
});

export type BlogPostFormValues = z.infer<typeof blogPostSchema>;

// Additional validation helper for server-side
export function validateBlogContent(content: string): { valid: boolean; error?: string } {
    // Check for potentially dangerous content
    const dangerousPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=/i, // onclick, onload, etc.
        /<iframe/i,
        /<object/i,
        /<embed/i,
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
            return { valid: false, error: 'Content contains potentially dangerous elements' };
        }
    }
    
    return { valid: true };
}
