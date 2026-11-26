import { describe, expect, it } from "vitest";
import { sanitizeHttpUrl } from "./sanitize";
import { getSafeImageSrc } from "./imageUtils";
import { getYouTubeEmbedUrl, getVimeoEmbedUrl } from "./mediaUtils";
import { sanitizeHtml } from "./security";

describe("Client Red-Team XSS & URL Sanitization Defenses", () => {
  it("blocks javascript:, vbscript:, data:text/html, and protocol-relative URLs", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeHttpUrl("//evil.example/x", { allowRelative: true })).toBeNull();
    expect(sanitizeHttpUrl("/\\evil.example/x", { allowRelative: true })).toBeNull();
    expect(sanitizeHttpUrl("https://user:pass@evil.example/x")).toBeNull();
    expect(sanitizeHttpUrl("/learning-hub", { allowRelative: true })).toBe("/learning-hub");
    expect(sanitizeHttpUrl("http://example.com", { httpsOnly: true })).toBeNull();
    expect(sanitizeHttpUrl("https://www.tinkercad.com/embed/abc", { httpsOnly: true })).toBe(
      "https://www.tinkercad.com/embed/abc"
    );
  });

  it("rejects dangerous schemes in getSafeImageSrc and embed URL builders", () => {
    expect(getSafeImageSrc("javascript:alert(1)")).toBe("/placeholder.svg");
    expect(getSafeImageSrc("data:image/svg+xml;base64,PHN2Zz4=")).toBe("/placeholder.svg");
    expect(getSafeImageSrc("https://ibb.co/shortlink")).toBe("/placeholder.svg");
    expect(getSafeImageSrc("https://images.unsplash.com/photo-1.jpg")).toBe(
      "https://images.unsplash.com/photo-1.jpg"
    );
    expect(getSafeImageSrc("/club-logo.webp")).toBe("/club-logo.webp");

    expect(getYouTubeEmbedUrl("javascript:alert(1)")).toBe("");
    expect(getVimeoEmbedUrl("javascript:alert(1)")).toBe("");
    expect(getYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toContain(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
  });

  it("strips script, style, iframe, form, and inline event handlers in sanitizeHtml", () => {
    const cleaned = sanitizeHtml(
      '<p>Hello <strong>world</strong></p><script>alert(1)</script><style>body{display:none}</style><form action="https://evil.com"><input /><button>Submit</button></form><img src="x" onerror="alert(1)" />'
    );
    expect(cleaned).toContain("<p>Hello <strong>world</strong></p>");
    expect(cleaned).not.toContain("<script");
    expect(cleaned).not.toContain("<style");
    expect(cleaned).not.toContain("<form");
    expect(cleaned).not.toContain("onerror");
  });
});
