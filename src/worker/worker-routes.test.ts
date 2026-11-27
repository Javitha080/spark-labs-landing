// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryRateLimiter } from "./lib/rate-limit";
import { resetSpaShellImgCacheForTest } from "./routes/seo-assets";

const {
  insertCalls,
  selectCalledOnInsert,
  uploadCalls,
  setMockSupabaseConfig,
  mockConfig,
} = vi.hoisted(() => {
  const insertCalls: unknown[] = [];
  const selectCalledOnInsert = { value: false };
  const uploadCalls: unknown[] = [];
  const defaultBlogPosts = [
    {
      slug: "first-post",
      title: "First & Best <Post>",
      excerpt: "<p>Hello world</p>",
      author_name: "YICDVP",
      category: "Tutorial",
      published_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-02T10:00:00Z",
    },
  ];
  const config = {
    role: "editor" as string | null,
    userId: "user-editor-1",
    insertError: null as { code: string; message: string } | null,
    blogPosts: defaultBlogPosts,
  };

  return {
    insertCalls,
    selectCalledOnInsert,
    uploadCalls,
    setMockSupabaseConfig: (next: Partial<typeof config>) => Object.assign(config, next),
    mockConfig: config,
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-editor-1", email: "editor@dvpyic.dpdns.org" } },
        error: null,
      })),
    },
    rpc: vi.fn(async (name: string) => {
      if (name === "get_cms_role") {
        return { data: mockConfig.role, error: null };
      }
      return { data: null, error: null };
    }),
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(async (path: string) => {
          uploadCalls.push({ bucket, path });
          return { error: null };
        }),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        })),
      })),
    },
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => {
          if (table === "enrollment_submissions") {
            selectCalledOnInsert.value = true;
          }
          return chain;
        }),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(async () => {
          if (table === "blog_posts") {
            return {
              data: mockConfig.blogPosts,
              error: null,
            };
          }
          return { data: [], error: null };
        }),
        insert: vi.fn((rows: unknown[]) => {
          insertCalls.push(rows);
          const resultChain = {
            select: vi.fn(() => {
              selectCalledOnInsert.value = true;
              return {
                single: vi.fn(async () =>
                  mockConfig.insertError
                    ? { data: null, error: mockConfig.insertError }
                    : { data: { id: "enr-uuid-1" }, error: null }
                ),
              };
            }),
            then: (resolve: (v: unknown) => void) =>
              Promise.resolve(resolve({ error: mockConfig.insertError })),
          };
          return resultChain;
        }),
      };
      return chain;
    }),
  })),
}));

import worker from "./index";

const evalCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as never;

const baseEnv = (extra: Record<string, unknown> = {}) =>
  ({
    NODE_ENV: "development",
    VITE_SUPABASE_URL: "https://gtwqjuisdmbqlsjlatyj.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    VITE_SUPABASE_PROJECT_ID: "gtwqjuisdmbqlsjlatyj",
    ...extra,
  }) as never;

describe("Worker modular routes", () => {
  const originalCaches = (globalThis as unknown as { caches?: unknown }).caches;

  beforeEach(() => {
    insertCalls.length = 0;
    selectCalledOnInsert.value = false;
    uploadCalls.length = 0;
    setMockSupabaseConfig({
      role: "editor",
      insertError: null,
      blogPosts: [
        {
          slug: "first-post",
          title: "First & Best <Post>",
          excerpt: "<p>Hello world</p>",
          author_name: "YICDVP",
          category: "Tutorial",
          published_at: "2026-10-01T10:00:00Z",
          updated_at: "2026-10-02T10:00:00Z",
        },
      ],
    });
    resetSpaShellImgCacheForTest();
  });

  afterEach(() => {
    (globalThis as unknown as { caches?: unknown }).caches = originalCaches;
  });

  it("POST /api/enroll enforces origin, Turnstile, phone>=10, and dual-mode insert without .select() in anon mode", async () => {
    // Missing origin -> 403
    const noOrigin = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      baseEnv(),
      evalCtx
    );
    expect(noOrigin.status).toBe(403);

    // Missing turnstile -> 403
    const noToken = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://dvpyic.dpdns.org" },
        body: JSON.stringify({ name: "Ada" }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(noToken.status).toBe(403);

    // Phone < 10 chars -> 400
    const shortPhone = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
          "X-Turnstile-Token": "tok",
        },
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "07712345",
          grade: "11",
          interest: "Robotics",
          reason: "I love building autonomous robots.",
          consent: true,
        }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(shortPhone.status).toBe(400);

    // Valid publishable-key fallback -> 201 { ok: true } WITHOUT .select()
    const okAnon = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
        },
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "0771234567",
          department: "Science",
          interests: "Robotics",
          message: "Excited to build solar robots.",
          consent_given: true,
          turnstileToken: "test-token",
        }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(okAnon.status).toBe(201);
    expect(await okAnon.json()).toEqual({ ok: true });
    expect(selectCalledOnInsert.value).toBe(false);

    // Service-role mode -> 201 { ok: true, id } WITH .select("id")
    const okService = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
          "X-Turnstile-Token": "test-token",
        },
        body: JSON.stringify({
          name: "Grace Hopper",
          email: "grace@example.com",
          phone: "+94771234567",
          grade: "12",
          interest: "AI",
          reason: "Interested in compilers and robotics.",
          consent: true,
        }),
      }),
      baseEnv({ SUPABASE_SERVICE_ROLE_KEY: "service-role-key" }),
      evalCtx
    );
    expect(okService.status).toBe(201);
    expect(await okService.json()).toEqual({ ok: true, id: "enr-uuid-1" });
    expect(selectCalledOnInsert.value).toBe(true);
  });

  it("POST /api/upload-media uses c.get('supabase') in user-JWT mode when service key is absent", async () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
    const form = new FormData();
    form.append("file", new File([pngHeader], "avatar.png", { type: "image/png" }));
    form.append("bucketName", "avatars");

    const res = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/upload-media", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt-token" },
        body: form,
      }),
      baseEnv({ NODE_ENV: "production" }),
      evalCtx
    );
    expect(res.status).toBe(200);
    expect(uploadCalls).toHaveLength(1);
  });

  it("GET /rss.xml and /feed.xml emit escaped RSS 2.0 XML", async () => {
    const res = await worker.fetch(new Request("https://dvpyic.dpdns.org/rss.xml"), baseEnv(), evalCtx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/rss+xml");
    const xml = await res.text();
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("First &amp; Best &lt;Post&gt;");
    expect(xml).toContain("Hello world");

    const feedRes = await worker.fetch(new Request("https://dvpyic.dpdns.org/feed.xml"), baseEnv(), evalCtx);
    expect(feedRes.status).toBe(200);
  });

  it("POST /api/telemetry accepts sendBeacon text/plain JSON and writes to ANALYTICS", async () => {
    const writeDataPoint = vi.fn();
    const res = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          Origin: "https://dvpyic.dpdns.org",
        },
        body: JSON.stringify({
          kind: "vitals",
          path: "/blog?utm_source=x",
          metrics: { LCP: 1200, CLS: 0.01 },
          device: "mobile",
        }),
      }),
      baseEnv({ ANALYTICS: { writeDataPoint } }),
      evalCtx
    );
    expect(res.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalled();
  });

  it("POST /api/csp-report accepts CSP report payloads and returns 204", async () => {
    const writeDataPoint = vi.fn();
    const res = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/csp-report", {
        method: "POST",
        headers: { "Content-Type": "application/csp-report" },
        body: JSON.stringify({
          "csp-report": {
            "violated-directive": "script-src",
            "blocked-uri": "https://evil.example/a.js?secret=1",
            "document-uri": "https://dvpyic.dpdns.org/blog?q=test",
          },
        }),
      }),
      baseEnv({ ANALYTICS: { writeDataPoint } }),
      evalCtx
    );
    expect(res.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalled();
  });

  it("GET /.well-known/security.txt falls back cleanly when ASSETS returns 404", async () => {
    const res = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/.well-known/security.txt"),
      baseEnv({
        ASSETS: { fetch: vi.fn(async () => new Response("Not Found", { status: 404 })) },
      }),
      evalCtx
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Contact: mailto:admin@dvpyic.dpdns.org");
    expect(body).toContain("Canonical: https://dvpyic.dpdns.org/.well-known/security.txt");
  });

  it("caches prerendered bot HTML in caches.default without Vary and restores Vary: User-Agent on HIT", async () => {
    const cacheStore = new Map<string, Response>();
    (globalThis as unknown as { caches: unknown }).caches = {
      default: {
        match: vi.fn(async (req: Request) => {
          const hit = cacheStore.get(req.url);
          return hit ? hit.clone() : undefined;
        }),
        put: vi.fn(async (req: Request, res: Response) => {
          cacheStore.set(req.url, res.clone());
        }),
        delete: vi.fn(async () => true),
      },
    };

    const shellHtml = `<!doctype html><html><head><meta property="og:title" content="" /><meta property="og:description" content="" /><meta property="og:url" content="" /><meta property="og:type" content="" /><meta property="og:site_name" content="" /><meta property="og:image" content="" /><meta property="og:image:alt" content="" /><meta name="twitter:title" content="" /><meta name="twitter:description" content="" /><meta name="twitter:image" content="" /><meta name="twitter:image:alt" content="" /></head><body><div id="root"></div></body></html>`;
    const assetsFetch = vi.fn(async () =>
      new Response(shellHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );

    const env = baseEnv({ ASSETS: { fetch: assetsFetch } });

    const miss = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/about", {
        headers: { "User-Agent": "Googlebot/2.1" },
      }),
      env,
      evalCtx
    );
    expect(miss.status).toBe(200);
    expect(miss.headers.get("X-Cache")).toBe("MISS");
    expect(miss.headers.get("Vary")).toBe("User-Agent");
    expect(assetsFetch).toHaveBeenCalledTimes(1);

    const cachedEntry = cacheStore.get("https://dvpyic.dpdns.org/about?__bot_prerender=1");
    expect(cachedEntry).toBeTruthy();
    expect(cachedEntry?.headers.get("Vary")).toBeNull();

    const hit = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/about", {
        headers: { "User-Agent": "bingbot/2.0" },
      }),
      env,
      evalCtx
    );
    expect(hit.status).toBe(200);
    expect(hit.headers.get("X-Cache")).toBe("HIT");
    expect(hit.headers.get("Vary")).toBe("User-Agent");
    expect(assetsFetch).toHaveBeenCalledTimes(1);
  });

  it("GET /rss.xml strips XML-illegal ASCII control chars and keys D1 per feed alias", async () => {
    setMockSupabaseConfig({
      blogPosts: [
        {
          slug: "ctrl-post",
          title: "Solar\u0007 Drone\u000B Build",
          excerpt: "<p>Safe\u0000 body</p>",
          author_name: "Ada\u0007 Lovelace",
          category: "Robotics\u000C",
          published_at: "2026-10-01T10:00:00Z",
          updated_at: "2026-10-02T10:00:00Z",
        },
      ],
    });

    const d1Rows = new Map<string, { payload: string; cached_at: string; ttl_seconds: number }>();
    const cacheDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => (sql.includes("SELECT") ? (d1Rows.get(String(args[0])) ?? null) : null),
          run: async () => {
            if (sql.includes("INSERT")) {
              d1Rows.set(String(args[0]), {
                payload: String(args[1]),
                ttl_seconds: Number(args[2]),
                cached_at: new Date().toISOString(),
              });
            } else if (sql.includes("DELETE")) {
              d1Rows.delete(String(args[0]));
            }
            return { success: true };
          },
        }),
      }),
    };

    const env = baseEnv({ CACHE_DB: cacheDb });
    const rssRes = await worker.fetch(new Request("https://dvpyic.dpdns.org/rss.xml"), env, evalCtx);
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    // eslint-disable-next-line no-control-regex
    expect(rssXml).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/);
    expect(rssXml).toContain("Solar Drone Build");
    expect(rssXml).toContain('href="https://dvpyic.dpdns.org/rss.xml" rel="self"');

    const feedRes = await worker.fetch(new Request("https://dvpyic.dpdns.org/feed.xml"), env, evalCtx);
    expect(feedRes.status).toBe(200);
    expect(feedRes.headers.get("X-Cache")).toBe("MISS");
    const feedXml = await feedRes.text();
    expect(feedXml).toContain('href="https://dvpyic.dpdns.org/feed.xml" rel="self"');

    expect(d1Rows.has("rss:feed:xml:rss")).toBe(true);
    expect(d1Rows.has("rss:feed:xml:feed")).toBe(true);

    const inv = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/cache/invalidate/blog_posts", {
        method: "POST",
        headers: { Authorization: "Bearer editor-jwt" },
      }),
      env,
      evalCtx
    );
    expect(inv.status).toBe(200);
    expect(d1Rows.has("rss:feed:xml:rss")).toBe(false);
    expect(d1Rows.has("rss:feed:xml:feed")).toBe(false);
  });

  it("POST /api/enroll enforces 3/hr KV-absent fallback and maps Postgres P0001/22P02 to 400", async () => {
    const validBody = (email: string) =>
      JSON.stringify({
        name: "Alan Turing",
        email,
        phone: "0771234567",
        grade: "12",
        interest: "Computing",
        reason: "Building cryptography and robotics projects.",
        consent: true,
        turnstileToken: "tok",
      });

    // Distinct IPs avoid rateLimitMiddleware's IP limiter so enrollEmailLimiter (3/hr) is tested
    for (let i = 1; i <= 3; i++) {
      const ok = await worker.fetch(
        new Request("https://dvpyic.dpdns.org/api/enroll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://dvpyic.dpdns.org",
            "CF-Connecting-IP": `198.51.100.${i}`,
          },
          body: validBody("fallback-3hr@example.com"),
        }),
        baseEnv(),
        evalCtx
      );
      expect(ok.status).toBe(201);
    }

    const fourth = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
          "CF-Connecting-IP": "198.51.100.4",
        },
        body: validBody("fallback-3hr@example.com"),
      }),
      baseEnv(),
      evalCtx
    );
    expect(fourth.status).toBe(429);

    for (const code of ["P0001", "22P02"]) {
      setMockSupabaseConfig({ insertError: { code, message: "Invalid format" } });
      const bad = await worker.fetch(
        new Request("https://dvpyic.dpdns.org/api/enroll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://dvpyic.dpdns.org",
            "CF-Connecting-IP": `198.51.100.${code === "P0001" ? 5 : 6}`,
          },
          body: validBody(`db-err-${code.toLowerCase()}@example.com`),
        }),
        baseEnv(),
        evalCtx
      );
      expect(bad.status).toBe(400);
    }
  });

  it("POST /api/telemetry sanitizes Bearer tokens, emails, and control chars before logging", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await worker.fetch(
        new Request("https://dvpyic.dpdns.org/api/telemetry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://dvpyic.dpdns.org",
          },
          body: JSON.stringify({
            kind: "error",
            code: "0xERR",
            category: "auth",
            message: "Failed with Bearer secret.jwt.token for user alice@example.com\nforged-line",
            path: "/blog?token=leak",
            context: "boundary\r\nleak",
          }),
        }),
        baseEnv(),
        evalCtx
      );
      expect(res.status).toBe(204);
      expect(warnSpy).toHaveBeenCalled();
      const logged = String(warnSpy.mock.calls[0]?.[0] ?? "");
      expect(logged).toContain("Bearer [redacted]");
      expect(logged).toContain("[email]");
      expect(logged).not.toContain("secret.jwt.token");
      expect(logged).not.toContain("alice@example.com");
      expect(logged).not.toContain("\\n");
      expect(logged).not.toContain("\\r");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("hardens upload-media folderPath/X-Correlation-Id, contact Origin, canonical redirect, and sitemap-blog slugs", async () => {
    // 1. upload-media collapses // and ignores invalid X-Correlation-Id
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
    const form = new FormData();
    form.append("file", new File([pngHeader], "pic.png", { type: "image/png" }));
    form.append("bucketName", "avatars");
    form.append("folderPath", "../../evil/../clean");

    const upRes = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/upload-media", {
        method: "POST",
        headers: {
          Authorization: "Bearer editor-jwt",
          "X-Correlation-Id": "bad cid with spaces/../../",
        },
        body: form,
      }),
      baseEnv(),
      evalCtx
    );
    expect(upRes.status).toBe(200);
    const upBody = (await upRes.json()) as { path: string; correlationId: string };
    expect(upBody.path.startsWith("evil/clean/")).toBe(true);
    expect(upBody.path).not.toContain("//");
    expect(upBody.correlationId).toMatch(/^[0-9a-f-]{36}$/i);

    // 2. send-contact-message rejects missing or spoofed Origin
    const noOrig = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/send-contact-message", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Turnstile-Token": "tok" },
        body: JSON.stringify({ name: "Ada", email: "ada@example.com", message: "Hello there!" }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(noOrig.status).toBe(403);

    const badOrig = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/send-contact-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org.evil.com",
          "X-Turnstile-Token": "tok",
        },
        body: JSON.stringify({ name: "Ada", email: "ada@example.com", message: "Hello there!" }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(badOrig.status).toBe(403);

    // 3. Canonical redirect strips arbitrary port and pins host to CANONICAL_HOST
    const redir = await worker.fetch(
      new Request("http://evil.example.com:8443/about?ref=1"),
      baseEnv(),
      evalCtx
    );
    expect(redir.status).toBe(301);
    expect(redir.headers.get("Location")).toBe("https://dvpyic.dpdns.org/about?ref=1");

    // 4. sitemap-blog.xml skips invalid slugs
    setMockSupabaseConfig({
      blogPosts: [
        {
          slug: "valid-slug_1",
          title: "Valid",
          excerpt: "Valid",
          author_name: "YICDVP",
          category: "Tech",
          published_at: "2026-10-01T10:00:00Z",
          updated_at: "2026-10-02T10:00:00Z",
        },
        {
          slug: "../evil?x=1",
          title: "Evil",
          excerpt: "Evil",
          author_name: "YICDVP",
          category: "Tech",
          published_at: "2026-10-01T10:00:00Z",
          updated_at: "2026-10-02T10:00:00Z",
        },
      ],
    });
    const smRes = await worker.fetch(new Request("https://dvpyic.dpdns.org/sitemap-blog.xml"), baseEnv(), evalCtx);
    expect(smRes.status).toBe(200);
    const smXml = await smRes.text();
    expect(smXml).toContain("https://dvpyic.dpdns.org/blog/valid-slug_1");
    expect(smXml).not.toContain("evil?x=1");
  });

  it("POST /api/newsletter-subscribe fails closed in production without TURNSTILE_SECRET_KEY", async () => {
    // Missing X-Turnstile-Token -> 403
    const missingToken = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/newsletter-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
          "CF-Connecting-IP": "198.51.100.20",
        },
        body: JSON.stringify({ email: "reader@example.com" }),
      }),
      baseEnv({ NODE_ENV: "production" }),
      evalCtx
    );
    expect(missingToken.status).toBe(403);

    // Token provided, but TURNSTILE_SECRET_KEY missing in production -> 403 (fail closed)
    const missingSecretProd = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/newsletter-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
          "X-Turnstile-Token": "forged-token",
          "CF-Connecting-IP": "198.51.100.21",
        },
        body: JSON.stringify({ email: "reader@example.com" }),
      }),
      baseEnv({ NODE_ENV: "production" }),
      evalCtx
    );
    expect(missingSecretProd.status).toBe(403);
  });

  it("POST /api/verify-turnstile enforces Origin allowlist", async () => {
    const noOrigin = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/verify-turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.30" },
        body: JSON.stringify({ token: "test-token" }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(noOrigin.status).toBe(403);

    const badOrigin = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/verify-turnstile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org.evil.com",
          "CF-Connecting-IP": "198.51.100.31",
        },
        body: JSON.stringify({ token: "test-token" }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(badOrigin.status).toBe(403);

    const allowedOrigin = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/api/verify-turnstile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dvpyic.dpdns.org",
          "CF-Connecting-IP": "198.51.100.32",
        },
        body: JSON.stringify({ token: "test-token" }),
      }),
      baseEnv(),
      evalCtx
    );
    expect(allowedOrigin.status).toBe(200);
    expect(await allowedOrigin.json()).toEqual({ success: true });
  });

  it("seo-assets verificationTags injection preserves $-patterns verbatim", async () => {
    const shell = "<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>";
    const res = await worker.fetch(
      new Request("https://dvpyic.dpdns.org/"),
      baseEnv({
        ASSETS: {
          fetch: vi.fn(async () =>
            new Response(shell, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })
          ),
        },
        SEO_GOOGLE_VERIFICATION: "tok-$50-$$-$'-`",
      }),
      evalCtx
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.match(/<\/head>/gi) ?? []).toHaveLength(1);
    expect(html).toContain('<meta name="google-site-verification" content="tok-$50-$$-$\'-`" />');
  });

  it("InMemoryRateLimiter bounds store size via expired cleanup and oldest-key eviction", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-21T00:00:00Z"));
      const small = new InMemoryRateLimiter(2, 10_000, 3);
      expect(small.check("k1").remaining).toBe(1);
      expect(small.check("k2").remaining).toBe(1);
      expect(small.check("k3").remaining).toBe(1);
      expect(small.size).toBe(3);

      // Adding k4 within window evicts oldest key k1
      small.check("k4");
      expect(small.size).toBe(3);
      expect(small.check("k1").remaining).toBe(1);

      // Advancing past windowMs triggers expired cleanup before eviction
      vi.advanceTimersByTime(15_000);
      small.check("k5");
      expect(small.size).toBe(1);

      // Default maxEntries = 10_000 caps unbounded key floods
      const defaultLimiter = new InMemoryRateLimiter(5, 60_000);
      expect(defaultLimiter.maxEntries).toBe(10_000);
      for (let i = 0; i < 10_050; i++) {
        defaultLimiter.check(`flood:${i}`);
      }
      expect(defaultLimiter.size).toBeLessThanOrEqual(10_000);
    } finally {
      vi.useRealTimers();
    }
  });
});
