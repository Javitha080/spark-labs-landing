import clubLogoWebp from "@/assets/club-logo.webp";
import clubLogoAvif from "@/assets/club-logo.avif";
import { BOOT_EVENT, hasBooted } from "@/lib/boot";
import { prefersReducedMotion } from "@/lib/motion";

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

const decodedImages = new Set<string>();
let initialized = false;
let footerPreloaded = false;

const FOOTER_STAGE_ASSETS = [
  "/assets/school-plate.webp",
  "/assets/school-flock-a.webp",
  "/assets/school-flock-b.webp",
  "/assets/school-swirl-tl.webp",
  "/assets/school-swirl-tr.webp",
  "/assets/school-leaf-bl.webp",
];

function isConstrainedConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

/**
 * Fetches and decodes an image off the main paint path using HTMLImageElement.decode().
 * Browser engines decode WebP/AVIF bitmaps on background worker threads so the
 * first animation frame that displays the asset never stalls on rasterization.
 */
export function decodeImageOffThread(url: string): void {
  if (!url || typeof Image === "undefined" || decodedImages.has(url)) return;
  decodedImages.add(url);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    if (typeof img.decode === "function") {
      img.decode().catch(() => {
        /* non-critical warmup */
      });
    }
  } catch {
    /* ignore in non-browser environments */
  }
}

/**
 * Pre-decodes the desktop schoolhouse print footer's 6 WebP layers before the
 * visitor reaches the bottom of the page so the 1280x720 camera zoom-out starts
 * smoothly with zero texture upload hitch.
 */
export function preloadFooterArtwork(): void {
  if (footerPreloaded || typeof window === "undefined") return;
  if (isConstrainedConnection()) return;
  if (window.innerWidth < 1024) {
    // Mobile footer only uses the main plate image.
    footerPreloaded = true;
    decodeImageOffThread("/assets/school-plate.webp");
    return;
  }
  footerPreloaded = true;
  for (const src of FOOTER_STAGE_ASSETS) {
    decodeImageOffThread(src);
  }
}

function runWhenBootSettled(task: () => void, postBootDelayMs = 400): void {
  if (typeof window === "undefined") return;
  const scheduleIdle = () => {
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => task(), { timeout: 2500 });
      } else {
        task();
      }
    }, postBootDelayMs);
  };

  if (hasBooted() || prefersReducedMotion() || window.location.pathname !== "/") {
    scheduleIdle();
  } else {
    window.addEventListener(BOOT_EVENT, scheduleIdle, { once: true });
  }
}

/**
 * Fires parallel preloads for critical animation runtimes, display fonts, and
 * route-matched above-the-fold chunks/assets before React finishes mounting,
 * collapsing multi-hop dynamic import waterfalls.
 */
export function initCriticalAnimationPreload(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const pathname = window.location.pathname || "/";
  const isPortal = pathname.startsWith("/admin") || pathname.startsWith("/student");

  // 1. Pre-warm Space Grotesk display weights so canvas/SplitText typography
  //    measures final glyph metrics immediately without mid-intro re-layout.
  if (document.fonts?.load) {
    document.fonts.load('700 64px "Space Grotesk"').catch(() => {});
  }

  if (isPortal) return;

  // 2. Parallelize core animation chunks used across public routes (SmoothScroll + LazyMotion).
  void import("framer-motion");
  void import("gsap");
  void import("gsap/ScrollTrigger");

  const reduced = prefersReducedMotion();
  const fineDesktop = !reduced && window.matchMedia?.("(pointer: fine)")?.matches;
  if (fineDesktop) {
    void import("lenis");
  }

  // 3. Route-specific first-paint chunk & asset warmup (eliminates App -> Suspense waterfall).
  if (pathname === "/") {
    void import("@/pages/Index");
    const willPlayBoot = !hasBooted() && !reduced && !window.location.hash;
    if (willPlayBoot) {
      void import("@/components/loading/BootScreen");
      decodeImageOffThread(clubLogoAvif);
      decodeImageOffThread(clubLogoWebp);
    }
  } else if (pathname === "/leadership") {
    void import("@/pages/LeadershipPage");
    decodeImageOffThread("/assets/yic-dusk-wallpaper.webp");
  } else if (pathname === "/projects") {
    void import("@/pages/ProjectsPage");
  } else if (pathname === "/blog") {
    void import("@/pages/Blog");
  } else if (pathname === "/news") {
    void import("@/pages/News");
  } else if (pathname === "/events") {
    void import("@/pages/EventsPage");
  } else if (pathname === "/gallery") {
    void import("@/pages/GalleryPage");
  } else if (pathname === "/learning-hub") {
    void import("@/pages/LearningHub");
  }

  // 4. Post-boot idle warmup for Footer artwork & high-traffic secondary routes.
  if (!isConstrainedConnection()) {
    runWhenBootSettled(() => {
      preloadFooterArtwork();
    }, 800);
  }
}
