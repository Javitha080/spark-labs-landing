import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  isBot,
  injectPrerenderContent,
  injectBlogPostPrerender,
  injectInstructorPrerender,
  injectEntityPrerender,
  type BlogPostSeoMeta,
} from "./prerender";
import { normalizeOgImageUrl } from "./lib/seo-meta";

/* Realistic stand-in for the built index.html shell the Worker receives from
   the assets binding: static JSON-LD head, OG fallbacks, no <title>/ no
   description/canonical (removed per index.html strategy), GTM strip marker,
   React module script (Vite moves it into <head> at build time). */
const SHELL = `<!doctype html><html lang="en" dir="ltr"><head>
<meta charset="UTF-8" />
<meta name="keywords" content="YICDVP" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Young Innovators Club" />
<meta property="og:title" content="Young Innovators Club | STEM &amp; Robotics at DVP" />
<meta property="og:description" content="Join the Young Innovators Club (YICDVP)." />
<meta property="og:url" content="https://dvpyic.dpdns.org/" />
<meta property="og:image" content="https://dvpyic.dpdns.org/assets/og-yicdvp-banner.png" />
<meta property="og:image:alt" content="Young Innovators Club" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Young Innovators Club | STEM &amp; Robotics at DVP" />
<meta name="twitter:description" content="Join the Young Innovators Club (YICDVP)." />
<meta name="twitter:image" content="https://dvpyic.dpdns.org/assets/og-yicdvp-banner.png" />
<script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head><body>
<!-- BOT-STRIP-START:gtm-noscript --><noscript><iframe src="https://www.googletagmanager.com/ns.html"></iframe></noscript><!-- BOT-STRIP-END:gtm-noscript -->
<div id="root"></div>
<script type="module" src="/assets/index-abc123.js"></script>
</body></html>`;

const htmlResponse = (): Response =>
  new Response(SHELL, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

function jsonLdBlocks(html: string): Record<string, unknown>[] {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  const blocks: Record<string, unknown>[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    blocks.push(JSON.parse(m[1]) as Record<string, unknown>);
  }
  return blocks;
}

describe("isBot", () => {
  it("recognises every major search engine crawler", () => {
    const uas: Array<[string, boolean]> = [
      ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true],
      ["Mozilla/5.0 (compatible; Googlebot/2.1; Googlebot-Image/1.0)", true],
      ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", true],
      ["Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)", true],
      ["Mozilla/5.0 (compatible; YandexBot/3.0; feedback http://yandex.com/bots)", true],
      ["Mozilla/5.0 (compatible; DuckDuckBot/1.0; +http://duckduckgo.com/duckduckbot.html)", true],
      ["Mozilla/5.0 (compatible; Baiduspider/2.0)", true],
      ["Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)", true],
      ["Mozilla/5.0 Applebot-Extended", true],
      ["Chrome-Lighthouse", true],
      ["facebookexternalhit/1.1 WhatsApp/2.26", true],
      ["GPTBot/1.2 (+https://openai.com/gptbot)", true],
      ["OAI-SearchBot/1.0", true],
      ["PerplexityBot/1.0 (+https://perplexity.ai/perplexitybot)", true],
      ["ClaudeBot/1.0", true],
      ["Google-Extended", true],
      ["Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.com)", true],
      ["SeznamBot/3.0 (+http://napoveda.seznam.cz/seznambot/)", true],
      ["facebookplatform/1.0", false],
      ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36", false],
      ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0", false],
      ["", false],
    ];
    for (const [ua, expected] of uas) {
      expect(isBot(ua), ua).toBe(expected);
    }
  });
});

describe("injectPrerenderContent", () => {
  it("injects exactly one canonical title/description derived from PAGE_META", async () => {
    const { response, injected } = await injectPrerenderContent(htmlResponse(), "/about");
    expect(injected).toBe(true);
    const html = await response.text();

    const titles = html.match(/<title>[\s\S]*?<\/title>/gi) ?? [];
    expect(titles).toHaveLength(1);
    expect(titles[0]).toContain("About YICDVP");

    const descs = html.match(/<meta name="description"[^>]*>/gi) ?? [];
    expect(descs).toHaveLength(1);
    expect(descs[0]).toContain("Dharmapala Vidyalaya Pannipitiya");

    const canonicals = html.match(/<link rel="canonical"[^>]*>/gi) ?? [];
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0]).toContain('href="https://dvpyic.dpdns.org/about"');
  });

  it("rewrites the Open Graph card from PAGE_META, not the static fallback", async () => {
    const { response } = await injectPrerenderContent(htmlResponse(), "/projects");
    const html = await response.text();
    expect(html).toContain('property="og:title" content="Innovation Projects | YICDVP"');
    expect(html).not.toContain("Join the Young Innovators Club (YICDVP).");
  });

  it("injects a two-item breadcrumb and never single-item crumbs", async () => {
    const about = await injectPrerenderContent(htmlResponse(), "/about");
    const aboutBlocks = jsonLdBlocks(await about.response.text());
    const aboutCrumb = aboutBlocks.find((b) => b["@type"] === "BreadcrumbList") as
      | { itemListElement: { name: string }[] }
      | undefined;
    expect(aboutCrumb?.itemListElement.map((i) => i.name)).toEqual(["Home", "About"]);

    const home = await injectPrerenderContent(htmlResponse(), "/");
    const homeBlocks = jsonLdBlocks(await home.response.text());
    expect(homeBlocks.some((b) => b["@type"] === "BreadcrumbList")).toBe(false);
    expect(homeBlocks.some((b) => b["@type"] === "FAQPage")).toBe(true);
  });

  it("strips the React module script and BOT-STRIP regions for bot HTML", async () => {
    const { response } = await injectPrerenderContent(htmlResponse(), "/blog");
    const html = await response.text();
    expect(html).not.toContain("/assets/index-abc123.js");
    expect(html).not.toContain("googletagmanager.com/ns.html");
    expect(html).toContain('<div id="root">'); // prerender body present
  });

  it("leaves unknown paths untouched", async () => {
    const res = htmlResponse();
    const { response, injected } = await injectPrerenderContent(res, "/definitely-not-a-page");
    expect(injected).toBe(false);
    expect((await response.text()) === SHELL).toBe(true);
  });

  it("ignores <title>, description, and canonical tags inside HTML comments", async () => {
    const commentedShell = `<!doctype html><html lang="en"><head>
<!-- trap comment: <title>Fake</title> <meta name="description" content="Fake" /> <link rel="canonical" href="https://evil.example" /> -->
<meta property="og:title" content="" /><meta property="og:description" content="" /><meta property="og:url" content="" /><meta property="og:type" content="" /><meta property="og:site_name" content="" /><meta property="og:image" content="" /><meta property="og:image:alt" content="" /><meta name="twitter:title" content="" /><meta name="twitter:description" content="" /><meta name="twitter:image" content="" /><meta name="twitter:image:alt" content="" />
</head><body><div id="root"></div></body></html>`;

    const { response, injected } = await injectPrerenderContent(
      new Response(commentedShell, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }),
      "/about"
    );
    expect(injected).toBe(true);
    const out = await response.text();
    const withoutComments = out.replace(/<!--[\s\S]*?-->/g, "");

    const titles = withoutComments.match(/<title>[\s\S]*?<\/title>/gi) ?? [];
    expect(titles).toHaveLength(1);
    expect(titles[0]).toContain("About YICDVP");
    expect(out).toContain("<!-- trap comment: <title>Fake</title>");
  });

  it("injects exactly one <title> outside HTML comments on the real index.html (and dist/client/index.html if built)", async () => {
    const assertRealShell = async (filePath: string) => {
      const rawHtml = readFileSync(filePath, "utf8");
      const comments = rawHtml.match(/<!--[\s\S]*?-->/g) ?? [];
      for (const comment of comments) {
        expect(comment).not.toMatch(/<\/?title>/i);
        expect(comment).not.toMatch(/<meta\s+name="description"/i);
        expect(comment).not.toMatch(/<link\s+rel="canonical"/i);
      }

      const { response, injected } = await injectPrerenderContent(
        new Response(rawHtml, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }),
        "/about"
      );
      expect(injected).toBe(true);
      const out = await response.text();
      const withoutComments = out.replace(/<!--[\s\S]*?-->/g, "");

      const titles = withoutComments.match(/<title>[\s\S]*?<\/title>/gi) ?? [];
      expect(titles).toHaveLength(1);
      expect(titles[0]).toContain("About YICDVP");

      const descs = withoutComments.match(/<meta\s+name="description"[^>]*>/gi) ?? [];
      expect(descs).toHaveLength(1);

      const canonicals = withoutComments.match(/<link\s+rel="canonical"[^>]*>/gi) ?? [];
      expect(canonicals).toHaveLength(1);
      expect(canonicals[0]).toContain('href="https://dvpyic.dpdns.org/about"');
    };

    await assertRealShell(resolve(process.cwd(), "index.html"));
    const distIndex = resolve(process.cwd(), "dist/client/index.html");
    if (existsSync(distIndex)) {
      await assertRealShell(distIndex);
    }
  });
});

describe("injectBlogPostPrerender", () => {
  const basePost = (): BlogPostSeoMeta => ({
    title: "Building an ESP32 Weather Station",
    excerpt: "A step-by-step guide to building a WiFi weather station with ESP32 and DHT22.",
    coverImageUrl: "https://images.unsplash.com/photo-abc?w=1200",
    publishedAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    authorName: "Dulan Perera",
    category: "Tutorial",
  });

  it("passes through when the slug is unknown or unpublished", async () => {
    const res = htmlResponse();
    const { response, injected } = await injectBlogPostPrerender(res, "x", null);
    expect(injected).toBe(false);
    expect((await response.text()) === SHELL).toBe(true);
  });

  it("injects post title, canonical, article OG tags and cover image", async () => {
    const { response, injected } = await injectBlogPostPrerender(
      htmlResponse(),
      "esp32-weather-station",
      basePost()
    );
    expect(injected).toBe(true);
    const html = await response.text();

    expect((html.match(/<title>[\s\S]*?<\/title>/gi) ?? [])).toHaveLength(1);
    expect(html).toContain("Building an ESP32 Weather Station | Young Innovators Club");
    expect(html).toContain('rel="canonical" href="https://dvpyic.dpdns.org/blog/esp32-weather-station"');
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('property="og:image" content="https://images.unsplash.com/photo-abc?w=1200"');
    expect(html).toContain('property="article:published_time" content="2026-10-01T09:00:00.000Z"');
    expect(html).toContain('property="article:modified_time" content="2026-10-20T09:00:00.000Z"');
    expect(html).toContain('<meta property="article:section" content="Tutorial"');
  });

  it("prefixes relative cover images and falls back to none", async () => {
    const relative = { ...basePost(), coverImageUrl: "/assets/photo.webp" };
    const { response } = await injectBlogPostPrerender(htmlResponse(), "slug", relative);
    expect(await response.text()).toContain('property="og:image" content="https://dvpyic.dpdns.org/assets/photo.webp"');

    const none = { ...basePost(), coverImageUrl: "" };
    const { response: r2 } = await injectBlogPostPrerender(htmlResponse(), "slug", none);
    expect(await r2.text()).toContain('property="og:image" content="https://dvpyic.dpdns.org/assets/og-yicdvp-banner.png"');

    const protoRel = { ...basePost(), coverImageUrl: "//evil.example/payload.png" };
    const { response: r3 } = await injectBlogPostPrerender(htmlResponse(), "slug", protoRel);
    expect(await r3.text()).toContain('property="og:image" content="https://dvpyic.dpdns.org/assets/og-yicdvp-banner.png"');
  });

  it("emits BlogPosting + Home > Blog > post breadcrumb JSON-LD", async () => {
    const { response } = await injectBlogPostPrerender(
      htmlResponse(),
      "esp32-weather-station",
      basePost()
    );
    const blocks = jsonLdBlocks(await response.text());
    const posting = blocks.find((b) => b["@type"] === "BlogPosting") as Record<string, unknown> | undefined;
    expect(posting).toBeTruthy();
    expect(posting?.headline).toBe("Building an ESP32 Weather Station");
    expect((posting?.image as Record<string, unknown>) ?? undefined).toBeTruthy();

    const crumb = blocks.find((b) => b["@type"] === "BreadcrumbList") as
      | { itemListElement: { name: string }[] }
      | undefined;
    expect(crumb?.itemListElement.map((i) => i.name)).toEqual([
      "Home",
      "Blog",
      "Building an ESP32 Weather Station",
    ]);
  });

  it("escapes HTML in post fields so nothing can close the root/script tags", async () => {
    const evil = { ...basePost(), title: '<script>alert(1)</script>Nice post' };
    const { response } = await injectBlogPostPrerender(htmlResponse(), "slug", evil);
    const html = await response.text();
    expect(html).not.toContain("<script>alert(1)</script>Nice post");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;Nice post");
  });

  it("gives JS-less crawlers a visible h1 + link back to the blog index", async () => {
    const { response } = await injectBlogPostPrerender(
      htmlResponse(),
      "esp32-weather-station",
      basePost()
    );
    const html = await response.text();
    expect(html).toContain("<h1>Building an ESP32 Weather Station</h1>");
    expect(html).toContain('href="/blog"');
  });

  it("does not interpolate $-replacement patterns ($50 $$ $& $' `) in meta, JSON-LD, or #root", async () => {
    const dollarPayload = "$50 $$ $& $' ` Kit";
    const post: BlogPostSeoMeta = {
      title: `Title ${dollarPayload}`,
      excerpt: `Excerpt ${dollarPayload}`,
      coverImageUrl: "https://cdn.example.com/img-$50-$'.png",
      publishedAt: "2026-10-01T09:00:00.000Z",
      updatedAt: "2026-10-20T09:00:00.000Z",
      authorName: `Author ${dollarPayload}`,
      category: `Cat ${dollarPayload}`,
    };

    const { response, injected } = await injectBlogPostPrerender(
      htmlResponse(),
      "dollar-test",
      post
    );
    expect(injected).toBe(true);
    const html = await response.text();

    // Head boundary must stay intact (no duplicate </head> or unclosed attributes)
    expect(html.match(/<\/head>/gi) ?? []).toHaveLength(1);
    expect(html).toContain(
      '<meta property="og:title" content="Title $50 $$ $&amp; $\' ` Kit | Young Innovators Club" />'
    );
    expect(html).toContain(
      '<meta property="og:description" content="Excerpt $50 $$ $&amp; $\' ` Kit" />'
    );
    expect(html).toContain(
      '<meta property="og:image" content="https://cdn.example.com/img-$50-$\'.png" />'
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="Title $50 $$ $&amp; $\' ` Kit | Young Innovators Club" />'
    );
    expect(html).toContain(
      '<meta name="twitter:description" content="Excerpt $50 $$ $&amp; $\' ` Kit" />'
    );
    expect(html).toContain(
      '<meta property="article:section" content="Cat $50 $$ $&amp; $\' ` Kit" />'
    );
    expect(html).toContain("<h1>Title $50 $$ $&amp; $' ` Kit</h1>");
    expect(html).toContain("<p>Excerpt $50 $$ $&amp; $' ` Kit</p>");

    const blocks = jsonLdBlocks(html);
    const posting = blocks.find((b) => b["@type"] === "BlogPosting") as Record<string, unknown>;
    expect(posting.headline).toBe(`Title ${dollarPayload}`);
    expect(posting.description).toBe(`Excerpt ${dollarPayload}`);
    expect((posting.author as { name: string }).name).toBe(`Author ${dollarPayload}`);

    // Also verify instructor & entity prerenders preserve $-patterns in #root
    const instRes = await injectInstructorPrerender(htmlResponse(), "ada", {
      name: `Prof ${dollarPayload}`,
      bio: `Bio ${dollarPayload}`,
      avatarUrl: "https://user:pass@evil.example/avatar.png",
      courseCount: 1,
      totalStudents: 5,
      avgRating: null,
      courses: [{ title: `Course ${dollarPayload}`, slug: "c1" }],
    });
    const instHtml = await instRes.response.text();
    expect(instHtml).toContain("<h1>Prof $50 $$ $&amp; $' ` Kit</h1>");
    expect(instHtml).toContain('property="og:image" content="https://dvpyic.dpdns.org/assets/og-yicdvp-banner.png"');

    const entRes = await injectEntityPrerender(htmlResponse(), "/project/1", {
      title: `Proj ${dollarPayload}`,
      description: `Desc ${dollarPayload}`,
      imageUrl: "https://user@evil.example/img.png",
      ogType: "website",
      breadcrumbs: [{ name: "Home", item: "https://dvpyic.dpdns.org/" }],
      bodyHtml: `<section><h1>Proj $50 $$ $&amp; $' \` Kit</h1></section>`,
      jsonLdBlocks: [],
    });
    const entHtml = await entRes.response.text();
    expect(entHtml).toContain("<h1>Proj $50 $$ $&amp; $' ` Kit</h1>");
    expect(entHtml).toContain('property="og:image" content="https://dvpyic.dpdns.org/assets/og-yicdvp-banner.png"');
  });
});

describe("normalizeOgImageUrl", () => {
  it("accepts safe http(s) and site-relative URLs while rejecting credentials and unsafe schemes", () => {
    expect(normalizeOgImageUrl("https://cdn.example.com/a.webp?w=800")).toBe(
      "https://cdn.example.com/a.webp?w=800"
    );
    expect(normalizeOgImageUrl("http://cdn.example.com/a.png")).toBe(
      "http://cdn.example.com/a.png"
    );
    expect(normalizeOgImageUrl("/assets/photo.webp")).toBe(
      "https://dvpyic.dpdns.org/assets/photo.webp"
    );

    expect(normalizeOgImageUrl("")).toBe("");
    expect(normalizeOgImageUrl("https://user:pass@evil.com/x.png")).toBe("");
    expect(normalizeOgImageUrl("https://user@evil.com/x.png")).toBe("");
    expect(normalizeOgImageUrl("https://:pass@evil.com/x.png")).toBe("");
    expect(normalizeOgImageUrl("//evil.com/x.png")).toBe("");
    expect(normalizeOgImageUrl("/\\evil.com/x.png")).toBe("");
    expect(normalizeOgImageUrl("javascript:alert(1)")).toBe("");
    expect(normalizeOgImageUrl("data:image/png;base64,AAAA")).toBe("");
    expect(normalizeOgImageUrl("https://evil.com/a\nb.png")).toBe("");
  });
});
