import { describe, it, expect } from "vitest";
// App-level regression tests for the canonical-host middleware:
//  - never redirects for the live https://dvpyic.dpdns.org host or preview hosts
//  - 301s every external host (apex-relative, www, http) onto the single
//    canonical https origin so search engines never see duplicate hosts.
// NOTE: `wrangler dev --local` rewrites inbound URLs to the configured custom
// domain and can show a 301-to-self loop in logs - that is a dev-only artifact
// of route mapping, not this middleware (these tests prove the app behaviour).
import worker from "./index";

const evalCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as never;
const env = {
  NODE_ENV: "production",
  INDEXNOW_KEY: "4b249edb452b1c6276c655cc97a3bf41",
  VITE_SUPABASE_URL: "https://gtwqjuisdmbqlsjlatyj.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "test",
  VITE_SUPABASE_PROJECT_ID: "test",
} as never;

const call = (url: string) =>
  worker.fetch(new Request(url, { headers: { "User-Agent": "curl/8" } }), env, evalCtx);

describe("canonical-host middleware", () => {
  it("never redirects the canonical https origin", async () => {
    const res = await call("https://dvpyic.dpdns.org/api/build-version");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("never redirects preview/localhost hosts", async () => {
    const res = await call("http://localhost:8787/api/build-version");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("301s http non-canonical hosts to the canonical https origin", async () => {
    for (const url of [
      "http://www.dvpyic.dpdns.org/about",
      "https://www.dvpyic.dpdns.org/about",
      "http://evil-dvpyic.dpdns.org.evil.test/about",
    ]) {
      const res = await call(url);
      expect(res.status, url).toBe(301);
      expect(res.headers.get("location"), url).toBe("https://dvpyic.dpdns.org/about");
    }
  });
});
