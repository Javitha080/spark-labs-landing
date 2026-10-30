import { describe, expect, it } from "vitest";
import { isNewsCategory, NEWS_CATEGORY } from "./newsCategory";

describe("isNewsCategory", () => {
  it("matches the News category case-insensitively", () => {
    expect(isNewsCategory("News")).toBe(true);
    expect(isNewsCategory("news")).toBe(true);
    expect(isNewsCategory(" News ")).toBe(true);
    expect(isNewsCategory(NEWS_CATEGORY)).toBe(true);
  });

  it("rejects other categories, empties, and lookalikes", () => {
    expect(isNewsCategory("Tutorial")).toBe(false);
    expect(isNewsCategory("Tech News")).toBe(false);
    expect(isNewsCategory("")).toBe(false);
    expect(isNewsCategory(null)).toBe(false);
    expect(isNewsCategory(undefined)).toBe(false);
  });
});
