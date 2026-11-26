import { Hono } from "hono";
import { buildCSPPolicy } from "../../lib/cspPolicy";
import { safeWaitUntil } from "../lib/http";
import {
  injectBlogPostPrerender,
  injectEntityPrerender,
  injectInstructorPrerender,
  injectPrerenderContent,
  isBot,
} from "../prerender";
import { getCachedResponse } from "../lib/cache";
import {
  buildSearchEngineVerificationTags,
  loadBlogPostSeoMeta,
  loadCourseSeoMeta,
  loadInstructorSeoMeta,
  loadProjectSeoMeta,
  loadWorkshopSeoMeta,
} from "../lib/seo-meta";
import type { AppEnv } from "../lib/types";

const seoAssetsRoutes = new Hono<AppEnv>();

const CSP_POLICY = buildCSPPolicy();

const SECURITY_TXT_FALLBACK = [
  "Contact: mailto:admin@dvpyic.dpdns.org",
  "Contact: https://dvpyic.dpdns.org/contact",
  "Expires: 2027-11-20T00:00:00.000Z",
  "Preferred-Languages: en, si",
  "Canonical: https://dvpyic.dpdns.org/.well-known/security.txt",
  "",
].join("\n");

let spaShellHasImg: boolean | null = null;

export function resetSpaShellImgCacheForTest(): void {
  spaShellHasImg = null;
}

const isHtmlRequest = (pathname: string, contentType: string | null): boolean => {
  if (contentType && contentType.toLowerCase().startsWith("text/html")) return true;
  if (pathname === "/" || pathname.endsWith("/")) return true;
  const last = pathname.split("/").pop() || "";
  return !last.includes(".");
};

function applyHtmlSecurityHeaders(headers: Headers, prerendered: boolean) {
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Content-Security-Policy", CSP_POLICY);
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), xr-spatial-tracking=()"
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Vary", "User-Agent");
  headers.set(
    "Cache-Control",
    prerendered ? "public, max-age=300, s-maxage=600" : "public, max-age=0, must-revalidate"
  );
}

seoAssetsRoutes.get("/.well-known/security.txt", async (c) => {
  if (c.env.ASSETS) {
    try {
      const assetRes = await c.env.ASSETS.fetch(c.req.raw);
      if (assetRes.ok) {
        const headers = new Headers(assetRes.headers);
        headers.set("Content-Type", "text/plain; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=86400");
        headers.set("X-Content-Type-Options", "nosniff");
        return new Response(assetRes.body, { status: assetRes.status, headers });
      }
    } catch {
      // Fall through to inline fallback
    }
  }
  return c.text(SECURITY_TXT_FALLBACK, 200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  });
});

seoAssetsRoutes.all("*", async (c) => {
  if (!c.env.ASSETS) return c.notFound();
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    return c.text("Method Not Allowed", 405, { Allow: "GET, HEAD" });
  }

  try {
    const reqUrl = new URL(c.req.url);
    const pathname = reqUrl.pathname;
    const userAgent = c.req.header("User-Agent") || "";
    const isGetLike = c.req.method === "GET" || c.req.method === "HEAD";
    const botRequest = isGetLike && isBot(userAgent);
    const useBotEdgeCache =
      c.req.method === "GET" &&
      botRequest &&
      isHtmlRequest(pathname, null) &&
      !reqUrl.searchParams.has("preview");

    const normPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    const botCacheReq = useBotEdgeCache
      ? new Request(`${reqUrl.origin}${normPath}?__bot_prerender=1`, { method: "GET" })
      : null;

    if (botCacheReq) {
      const cachedBotRes = await getCachedResponse(botCacheReq);
      if (cachedBotRes) {
        const headers = new Headers(cachedBotRes.headers);
        applyHtmlSecurityHeaders(headers, true);
        headers.set("X-Cache", "HIT");
        headers.set("X-Cache-Source", "CF-Bot");
        return new Response(cachedBotRes.body, {
          status: cachedBotRes.status,
          headers,
        });
      }
    }

    let response = await c.env.ASSETS.fetch(c.req.raw);

    if (response.status === 404 && isHtmlRequest(pathname, null)) {
      const fallbackUrl = new URL(c.req.url);
      fallbackUrl.pathname = "/index.html";
      response = await c.env.ASSETS.fetch(
        new Request(fallbackUrl.toString(), {
          method: c.req.method === "HEAD" ? "HEAD" : "GET",
          headers: c.req.raw.headers,
        })
      );
    }

    const contentType = response.headers.get("Content-Type");
    const servingHtml = isHtmlRequest(pathname, contentType);

    let prerendered = false;
    if (isGetLike && servingHtml && botRequest) {
      const blogSlugMatch = /^\/blog\/([a-zA-Z0-9._~-]{1,200})\/?$/.exec(pathname);
      const instructorSlugMatch = /^\/learning-hub\/instructor\/([^/]{1,200})\/?$/.exec(pathname);
      const projectIdMatch = /^\/project\/([0-9a-fA-F-]{1,36})\/?$/.exec(pathname);
      const courseSlugMatch = /^\/learning-hub\/course\/([^/]{1,200})\/?$/.exec(pathname);
      const workshopIdMatch = /^\/learning-hub\/workshop\/([0-9a-fA-F-]{1,36})\/?$/.exec(pathname);

      let botResult: Promise<{ response: Response; injected: boolean }> | null = null;
      if (blogSlugMatch) {
        botResult = injectBlogPostPrerender(
          response,
          blogSlugMatch[1],
          await loadBlogPostSeoMeta(c.env, blogSlugMatch[1])
        );
      } else if (instructorSlugMatch) {
        botResult = injectInstructorPrerender(
          response,
          instructorSlugMatch[1],
          await loadInstructorSeoMeta(c.env, instructorSlugMatch[1])
        );
      } else if (projectIdMatch) {
        botResult = injectEntityPrerender(
          response,
          `/project/${projectIdMatch[1]}`,
          await loadProjectSeoMeta(c.env, projectIdMatch[1])
        );
      } else if (courseSlugMatch) {
        const courseSlug = courseSlugMatch[1].toLowerCase();
        botResult = injectEntityPrerender(
          response,
          `/learning-hub/course/${encodeURIComponent(courseSlug)}`,
          await loadCourseSeoMeta(c.env, courseSlug)
        );
      } else if (workshopIdMatch) {
        botResult = injectEntityPrerender(
          response,
          `/learning-hub/workshop/${workshopIdMatch[1]}`,
          await loadWorkshopSeoMeta(c.env, workshopIdMatch[1])
        );
      }

      const prerenderResult = botResult
        ? await botResult
        : await injectPrerenderContent(response, pathname);
      response = prerenderResult.response;
      prerendered = prerenderResult.injected;
    }

    let materializedHtml: string | null = null;
    if (isGetLike && servingHtml && (pathname === "/" || pathname === "/index.html")) {
      const verificationTags = buildSearchEngineVerificationTags(c.env);
      if (verificationTags) {
        const html = await response.text();
        materializedHtml = html.includes("</head>")
          ? html.replace("</head>", () => `${verificationTags}</head>`)
          : html + verificationTags;
        response = new Response(materializedHtml, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    }

    // Smart HTMLRewriter skip: index.html and prerender.ts currently emit 0 <img> tags.
    // Skip HEAD entirely; for materialized HTML check .includes("<img"); for unmaterialized
    // SPA shell cache a one-time isolate probe so HTMLRewriter runs only when needed.
    if (servingHtml && c.req.method === "GET") {
      let needsRewrite = false;
      if (materializedHtml !== null) {
        needsRewrite = materializedHtml.includes("<img");
      } else if (prerendered) {
        const bodyText = await response.clone().text();
        needsRewrite = bodyText.includes("<img");
      } else {
        if (spaShellHasImg === null) {
          const shellText = await response.clone().text();
          spaShellHasImg = shellText.includes("<img");
        }
        needsRewrite = spaShellHasImg;
      }

      if (needsRewrite) {
        const rewriter = new HTMLRewriter().on("img:not([loading])", {
          element(element) {
            element.setAttribute("loading", "lazy");
            element.setAttribute("decoding", "async");
          },
        });
        response = rewriter.transform(response);
      }
    }

    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    headers.set("X-Content-Type-Options", "nosniff");

    if (servingHtml) {
      applyHtmlSecurityHeaders(headers, prerendered);
    } else if (pathname.startsWith("/assets/") && /-[a-zA-Z0-9]{6,}\./.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\.(woff2?|ttf|otf|eot)(\?|$)/.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)(\?|$)/.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    } else if (pathname === "/manifest.json" || pathname === "/sw.js") {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }

    if (botCacheReq && prerendered && response.status === 200) {
      const outgoing = new Response(response.body, {
        status: response.status,
        headers,
      });
      const cacheClone = outgoing.clone();
      const cacheHeaders = new Headers(cacheClone.headers);
      // Strip Vary inside caches.default so every bot UA shares the same cache entry
      cacheHeaders.delete("Vary");
      cacheHeaders.set("Cache-Control", "public, max-age=300, s-maxage=600");
      const cacheable = new Response(cacheClone.body, {
        status: cacheClone.status,
        statusText: cacheClone.statusText,
        headers: cacheHeaders,
      });
      try {
        const cache = (caches as unknown as { default: Cache }).default;
        await safeWaitUntil(c, cache.put(botCacheReq, cacheable));
      } catch {
        // Ignore cache write errors
      }
      outgoing.headers.set("X-Cache", "MISS");
      return outgoing;
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Asset fetch error",
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return c.notFound();
  }
});

export default seoAssetsRoutes;
