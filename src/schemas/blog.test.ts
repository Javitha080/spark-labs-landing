import { describe, expect, it } from "vitest";
import { blogPostSchema, validateBlogContent } from "./blog";

const validPost = {
  title: "Students build earthquake detector",
  slug: "students-build-earthquake-detector",
  content: "x".repeat(60),
  author_name: "Tharindu Perera",
  category: "Projects",
  status: "published" as const,
};

describe("blogPostSchema", () => {
  it("accepts a minimal valid post", () => {
    const result = blogPostSchema.safeParse(validPost);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_featured).toBe(false);
    }
  });

  it("rejects titles shorter than 5 characters", () => {
    expect(blogPostSchema.safeParse({ ...validPost, title: "Hi!" }).success).toBe(false);
  });

  it("rejects slugs with uppercase letters or spaces", () => {
    expect(
      blogPostSchema.safeParse({ ...validPost, slug: "Students Build Detector" }).success,
    ).toBe(false);
  });

  it("rejects content under 50 characters", () => {
    expect(blogPostSchema.safeParse({ ...validPost, content: "too short" }).success).toBe(false);
  });

  it("rejects unknown status values", () => {
    expect(
      blogPostSchema.safeParse({ ...validPost, status: "archived" }).success,
    ).toBe(false);
  });

  it("allows an empty author_image_url string", () => {
    expect(
      blogPostSchema.safeParse({ ...validPost, author_image_url: "" }).success,
    ).toBe(true);
  });
});

describe("validateBlogContent", () => {
  it("accepts plain rich text", () => {
    expect(
      validateBlogContent("<p>Students presented their robot at the fair.</p>"),
    ).toEqual({ valid: true });
  });

  it("rejects script tags", () => {
    expect(validateBlogContent("<p>ok</p><script>alert(1)</script>").valid).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(validateBlogContent(' <a href="javascript:alert(1)">click</a>').valid).toBe(
      false,
    );
  });

  it("rejects inline event handlers", () => {
    expect(validateBlogContent('<img src="x" onload="alert(1)">').valid).toBe(false);
  });

  it("rejects iframes and embedded objects", () => {
    expect(validateBlogContent("<iframe src='//evil.example'></iframe>").valid).toBe(false);
    expect(validateBlogContent("<object data='evil'></object>").valid).toBe(false);
  });
});
