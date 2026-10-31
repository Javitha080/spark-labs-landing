import { describe, expect, it } from "vitest";
import { validateImageUpload, ACCEPT_IMAGE_ATTR } from "./uploadValidation";

const MB = 1024 * 1024;

describe("validateImageUpload", () => {
  it("accepts a normal PNG and derives the extension from the MIME type", () => {
    const result = validateImageUpload({ name: "photo.JPEG", type: "image/jpeg", size: MB }, 2 * MB);

    expect(result).toEqual({ ok: true, error: "", mime: "image/jpeg", ext: "jpg" });
  });

  it("rejects SVG declared by MIME type", () => {
    const result = validateImageUpload({ name: "logo.png", type: "image/svg+xml", size: 1024 }, 2 * MB);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("SVG");
  });

  it("rejects SVG declared only by extension", () => {
    const result = validateImageUpload({ name: "logo.svg", type: "image/png", size: 1024 }, 2 * MB);

    expect(result.ok).toBe(false);
  });

  it("rejects non-image types even when they are otherwise harmless", () => {
    const result = validateImageUpload({ name: "cv.pdf", type: "application/pdf", size: 1024 }, 2 * MB);

    expect(result.ok).toBe(false);
  });

  it("rejects a payload renamed to an image extension with an unknown MIME", () => {
    const result = validateImageUpload(
      { name: "payload.html", type: "text/html", size: 1024 },
      2 * MB,
    );

    expect(result.ok).toBe(false);
  });

  it("falls back to the extension when the browser reports no usable MIME", () => {
    const result = validateImageUpload(
      { name: "avatar.HEIC", type: "application/octet-stream", size: 1024 },
      2 * MB,
    );

    expect(result).toEqual({ ok: true, error: "", mime: "image/heic", ext: "heic" });
  });

  it("enforces the per-component size cap", () => {
    const result = validateImageUpload({ name: "big.png", type: "image/png", size: 3 * MB }, 2 * MB);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("limit is 2 MB");
  });

  it("does not advertise SVG in the native file picker", () => {
    expect(ACCEPT_IMAGE_ATTR).not.toContain("svg");
  });
});
