import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(async () => ({ data: [], error: null })),
      };
      return chain;
    }),
  })),
}));

import { normalizeOgImageUrl } from "./lib/seo-meta";
import { isAllowedOrigin } from "./lib/http";
import { sanitizeObject } from "./lib/sanitize";
import { injectPrerenderContent } from "./prerender";
import worker from "./index";

const evalCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as never;

const prodEnv = (extra: Record<string, unknown> = {}) =>
  ({
    NODE_ENV: "production",
    VITE_SUPABASE_URL: "https://gtwqjuisdmbqlsjlatyj.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    VITE_SUPABASE_PROJECT_ID: "gtwqjuisdmbqlsjlatyj",
    ...extra,
  }) as never;

describe("Red-Team Security Hardening & SEO Regression Suite", () => {
  it("blocks SSRF / private-network / metadata / localhost OG image URLs", () => {
    const blocked = [
      "http://localhost/secret.png",
      "https://sub.localhost/a.png",
      "http://127.0.0.1/a.png",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/internal.png",
      "http://172.16.0.1/internal.png",
      "http://192.168.1.1/router.png",
      "http://100.64.0.1/cgnat.png",
      "http://0.0.0.0/zero.png",
      "http://[::1]/loopback.png",
      "http://[fe80::1]/linklocal.png",
      "http://[fc00::1]/ula.png",
      "http://[::ffff:127.0.0.1]/mapped.png",
      "http://2130706433/decimal-ip.png",
      "http://0x7f000001/hex-ip.png",
      "http://0177.0.0.1/octal-ip.png",
      "http://printer.local/a.png",
      "https://metadata.google.internal/a.png",
    ];
    for (const url of blocked) {
      expect(normalizeOgImageUrl(url), url).toBe("");
    }
    expect(normalizeOgImageUrl("https://images.unsplash.com/photo-1.webp")).toBe(
      "https://images.unsplash.com/photo-1.webp"
    );
  });

  it("rejects localhost Origin in production while allowing canonical production origin", async () => {
    expect(isAllowedOrigin("http://localhost:8080", { NODE_ENV: "development" })).toBe(true);
    expect(isAllowedOrigin("http://localhost:8080", { NODE_ENV: "production" })).toBe(false);
    expect(isAllowedOrigin("http://127.0.0.1:3000", { NODE_ENV: "production" })).toBe(false);
    expect(isAllowedOrigin("https://dvpyic.dpdns.org", { NODE_ENV: "production" })).toBe(true);

    const res = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:8080",
          "CF-Connecting-IP": "198.51.100.88",
        },
        body: JSON.stringify({}),
      }),
      prodEnv(),
      evalCtx
    );
    expect(res.status).toBe(403);
  });

  it("enforces 413 Payload Too Large on oversized JSON bodies to prevent memory DoS", async () => {
    const oversized = JSON.stringify({ token: "a".repeat(70_000) });
    const res = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/verify-turnstile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
          "CF-Connecting-IP": "198.51.100.89",
        },
        body: oversized,
      }),
      prodEnv(),
      evalCtx
    );
    expect(res.status).toBe(413);
  });

  it("redacts JWTs, base64 Bearer tokens, and control chars across all telemetry fields", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const res = await worker.fetch(
        new Request("https://dvpyic.dpdns.org/api/telemetry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://dvpyic.dpdns.org",
            "CF-Connecting-IP": "198.51.100.90",
          },
          body: JSON.stringify({
            kind: "error",
            code: "ERR\nINJECT\rBearer+abc/def=123",
            category: "auth\tuser@evil.com",
            message: `Failed with Bearer abc+/def== and ${fakeJwt}`,
            path: "/admin\n/secret?token=123",
          }),
        }),
        prodEnv(),
        evalCtx
      );
      expect(res.status).toBe(204);
      const logged = String(warnSpy.mock.calls.at(-1)?.[0] ?? "");
      expect(logged).not.toContain(fakeJwt);
      expect(logged).not.toContain("abc+/def==");
      expect(logged).not.toContain("user@evil.com");
      expect(logged).not.toContain("token=123");
      expect(logged).toContain("[jwt]");
      expect(logged).toContain("Bearer [redacted]");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("strips prototype pollution keys in sanitizeObject", () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"bad":1},"name":"<b>Ada</b>"}');
    const clean = sanitizeObject(payload) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(clean, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(clean, "constructor")).toBe(false);
    expect(clean.name).toBe("Ada");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("serves X-Content-Type-Options: nosniff on XML sitemaps and RSS feeds and keeps /verify in sitemap & prerender", async () => {
    const rssRes = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/rss.xml"),
      prodEnv(),
      evalCtx
    );
    expect(rssRes.status).toBe(200);
    expect(rssRes.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const smRes = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/sitemap-blog.xml"),
      prodEnv(),
      evalCtx
    );
    expect(smRes.status).toBe(200);
    expect(smRes.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const verifyRes = await injectPrerenderContent(
      new Response('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
      "/verify"
    );
    expect(verifyRes.injected).toBe(true);
    const verifyHtml = await verifyRes.response.text();
    expect(verifyHtml).toContain("Verify Certificate | YICDVP Learning Hub");
    expect(verifyHtml).toContain('rel="canonical" href="https://dvpyic.dpdns.org/verify"');

    const sitemapXml = readFileSync(resolve(process.cwd(), "public/sitemap.xml"), "utf8");
    expect(sitemapXml).toContain("https://dvpyic.dpdns.org/verify");
  });
});
