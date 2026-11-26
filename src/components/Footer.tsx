import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent } from "react";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Turnstile } from "@/components/Turnstile";
import { sanitizeEmail } from "@/lib/sanitize";
import { clubLogo, clubLogoAvif, schoolLogo, schoolLogoAvif } from "@/components/ClubLogo";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { scrollToTarget, scrollToTop } from "@/lib/scroll";
import { prefetchRoute, prefetchData } from "@/lib/prefetch";

/**
 * Footer - the schoolhouse print footer, rebuilt from the reference clip
 * ("vintage blue-ink engraving of the school facade"). A cream prospectus
 * stage with three regions:
 *
 *   Band 1  brand strip - our logos + wordmark left, socials + copyright
 *           right, set on the cream paper above the artwork;
 *   Plate   the engraved schoolhouse (1280x720 still, one cqw-proportional
 *           container). The reveal is the film's own camera zoom-out
 *           (scale 1.5 -> 1, ~1.5x-easing) plus a short defocus; afterwards
 *           the ink swirls slide in from the frame edges and the bird flock
 *           stop-motion flutters in place (two film-exact poses crossfade)
 *           with an unending slow drift. A static grain plate + paper
 *           vignette finish the print feel. Dark mode re-tones the artwork
 *           into a "night print" via a static CSS filter on a wrapper that
 *           never animates, so the zoom stays compositor-cheap.
 *   Band 2  colophon strip - Menu + Explore columns (react-router Links),
 *           club description, and the newsletter form with its Turnstile
 *           widget (size "flexible" so the 65px widget fits the strip).
 *
 * The flock/swirl/leaf overlays are film crops positioned over the exact
 * baked artwork coordinates, and pose A is literally the plate's own
 * pixels, so the takeover from baked birds to animated flock is seamless.
 *
 * Performance: everything animates compositor-safe transform/opacity (the
 * one exception is the 1.2s intro defocus, allowed as a short reveal).
 * The stage renders only from `lg` up; smaller screens get a stacked,
 * static version with a lazy plate image - no loops on phones.
 * Reduced motion: the site-wide clamp one-shots every animation, which
 * parks the zoom/defocus/strips on their final states and freezes the
 * flock at pose A.
 */

const PLATE_URL = "/assets/school-plate.webp";
const FLOCK_POSE_A_URL = "/assets/school-flock-a.webp";
const FLOCK_POSE_B_URL = "/assets/school-flock-b.webp";
const SWIRL_TL_URL = "/assets/school-swirl-tl.webp";
const SWIRL_TR_URL = "/assets/school-swirl-tr.webp";
const LEAF_BL_URL = "/assets/school-leaf-bl.webp";

/* Overlay geometry: film crops are placed back at their exact baked
   plate coordinates (fractions of the 1280x720 plate). They live inside
   the zoom wrapper, so they ride the reveal together with the artwork. */
const OVERLAY_STYLE: Record<string, CSSProperties> = {
  flock: { left: "50%", top: "2.7778%", width: "40.625%", aspectRatio: "520 / 150" },
  swarmTl: { left: "0%", top: "0%", width: "55.469%", aspectRatio: "710 / 80" },
  swirlTr: { left: "82.8125%", top: "0%", width: "17.1875%", aspectRatio: "220 / 60" },
  leafBl: { left: "0%", top: "90.2778%", width: "6.09375%", aspectRatio: "78 / 70" },
};

const BAND_PADDING = "2.9cqw";

const MENU_LINKS = [
  { label: "About us", to: "/about" },
  { label: "Projects", to: "/projects" },
  { label: "Events", to: "/events" },
  { label: "Gallery", to: "/gallery" },
  { label: "News", to: "/news" },
  { label: "Blog", to: "/blog" },
];

const EXPLORE_LINKS = [
  { label: "STEM Learning Hub", to: "/learning-hub" },
  { label: "Verify Certificate", to: "/verify" },
  { label: "Join the Club", to: "/#join" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms of Service", to: "/terms-of-service" },
];

const SOCIALS = [
  { icon: Facebook, href: "https://www.facebook.com/dharmapalaLKofficia/", label: "Facebook" },
  { icon: Instagram, href: "https://www.instagram.com/yicdvp_official/", label: "Instagram" },
  { icon: Youtube, href: "https://www.youtube.com/channel/UCqCTubkeHjeldLAC4Jh1j8Q", label: "Youtube" },
];

const LOGO_IMG_CLASS = "h-full w-auto object-contain select-none";

const Footer = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();
  const isStageLayout = useMediaQuery("(min-width: 1024px)");
  const [layoutGen, setLayoutGen] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      setLayoutGen((g) => g + 1);
    };
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  const [armed, setArmed] = useState(false);

  // ── Newsletter box state ──────────────────────────────────────────────────
  // The form posts to /api/newsletter-subscribe, which now upserts the address
  // into Supabase BEFORE emailing the admin inbox - a bounced notification can
  // no longer lose a subscription. Both contact form and this box share the
  // same X-Turnstile-Token convention; the widget is built by the Worker's
  // check (mandatory only whenever the server secret exists), so UI-wise we
  // follow the Contact form: block submit until a token arrives, but still
  // allow the attempt when the widget itself errored so the server can rule.
  const [nlEmail, setNlEmail] = useState("");
  const [nlTokenState, setNlTokenState] = useState<{
    token: string | null;
    error: boolean;
    layout: boolean;
    gen: number;
  }>({ token: null, error: false, layout: isStageLayout, gen: 0 });
  const isTokenFresh =
    nlTokenState.layout === isStageLayout && nlTokenState.gen === layoutGen;
  const nlToken = isTokenFresh ? nlTokenState.token : null;
  const nlTokenError = isTokenFresh ? nlTokenState.error : false;
  const [nlTokenKey, setNlTokenKey] = useState(0);
  const [nlPhase, setNlPhase] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [nlMessage, setNlMessage] = useState("");

  const resetNewsletterTurnstile = useCallback(() => {
    // Turnstile tokens are single-use: remount the widget and get a fresh one.
    setNlTokenState((prev) => ({
      ...prev,
      token: null,
      layout: isStageLayout,
      gen: layoutGen,
    }));
    setNlTokenKey((k) => k + 1);
  }, [isStageLayout, layoutGen]);

  const handleNewsletterSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = sanitizeEmail(nlEmail);
      if (!email) {
        setNlPhase("error");
        setNlMessage("Please enter a valid email address.");
        return;
      }

      setNlPhase("sending");
      setNlMessage("");
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (nlToken) headers["X-Turnstile-Token"] = nlToken;

        const response = await fetch("/api/newsletter-subscribe", {
          method: "POST",
          headers,
          body: JSON.stringify({ email }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };

        if (response.ok && payload.success) {
          setNlPhase("success");
          setNlMessage("You're on the list - see you in the next issue.");
          setNlEmail("");
          resetNewsletterTurnstile();
          return;
        }

        // 4xx = the request itself was rejected (validation, Turnstile, rate
        // limit) - surface the server's reason. 5xx / network errors degrade
        // to a generic retry hint. Either way the token was consumed.
        setNlPhase("error");
        setNlMessage(
          response.status === 429
            ? "Too many attempts just now. Please try again in a few minutes."
            : payload.error || "Subscription failed. Please try again shortly.",
        );
        resetNewsletterTurnstile();
      } catch {
        setNlPhase("error");
        setNlMessage("Network hiccup - please try again.");
        resetNewsletterTurnstile();
      }
    },
    [nlEmail, nlToken, resetNewsletterTurnstile],
  );

  // Single-shot viewport reveal: arm once on first intersection and disconnect
  // so footer links/copy never re-clip while scrolling near the bottom.
  useEffect(() => {
    if (armed) return undefined;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setArmed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [armed]);

  const handleLinkPrefetch = useCallback((to: string) => {
    if (to === "/#join") {
      prefetchRoute("/");
      return;
    }
    prefetchRoute(to);
    if (to === "/projects") prefetchData("projects-featured");
    else if (to === "/events") prefetchData("events");
    else if (to === "/news") prefetchData("news-posts");
    else if (to === "/blog") prefetchData("blog-posts");
  }, []);

  const handleLinkClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, to: string) => {
      if (to === "/#join" && pathname === "/") {
        e.preventDefault();
        scrollToTarget("join");
      } else if (to === "/" && pathname === "/") {
        e.preventDefault();
        scrollToTop();
      }
    },
    [pathname],
  );

  return (
    <footer
      ref={containerRef}
      data-armed={armed ? "true" : "false"}
      data-site-footer
      aria-label="YICDVP schoolhouse print footer"
      className="relative w-full select-none overflow-hidden"
    >
      {/* Cream prospectus stage: Band 1 / Plate (1280x720) / Band 2 flex stack.
          Band 2 expands naturally so links & Turnstile never clip at 1024px. */}
      <div
        className="relative mx-auto hidden w-full overflow-hidden bg-[var(--school-bg,#f5ebd9)] lg:flex lg:flex-col"
        style={{ containerType: "inline-size" }}
      >
        {/* ── BAND 1: brand strip ─────────────────────────────────────── */}
        <div
          className="relative z-10 w-full overflow-hidden"
          style={{ height: "max(5.625cqw, 64px)", paddingInline: BAND_PADDING }}
        >
          <div className="flex h-full items-center justify-between">
            {/* Logo lockup */}
            <div className="animate-wipe-logo flex items-center">
              <Link
                to="/"
                aria-label="YICDVP home"
                onMouseEnter={() => handleLinkPrefetch("/")}
                onFocus={() => handleLinkPrefetch("/")}
                onClick={(e) => handleLinkClick(e, "/")}
                className="flex min-h-[44px] items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
              >
                <div className="flex items-center" style={{ gap: "0.6cqw", height: "4.7cqw" }}>
                  <picture className="contents">
                    <source type="image/avif" srcSet={clubLogoAvif} />
                    <source type="image/webp" srcSet={clubLogo} />
                    <img
                      src={clubLogo}
                      alt="Young Innovators Club logo"
                      width={1024}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className={LOGO_IMG_CLASS}
                    />
                  </picture>
                  <picture className="contents">
                    <source type="image/avif" srcSet={schoolLogoAvif} />
                    <source type="image/webp" srcSet={schoolLogo} />
                    <img
                      src={schoolLogo}
                      alt="Dharmapala Vidyalaya logo"
                      width={200}
                      height={200}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className={LOGO_IMG_CLASS}
                    />
                  </picture>
                </div>
                <span className="flex flex-col" style={{ marginLeft: "0.75cqw" }}>
                  <span
                    className="font-display font-black lowercase leading-none tracking-tighter"
                    style={{ fontSize: "max(1.7cqw, 20px)", color: "var(--school-ink, #232e6b)" }}
                  >
                    yicdvp
                  </span>
                  <span
                    className="uppercase"
                    style={{
                      marginTop: "0.22cqw",
                      fontSize: "max(0.68cqw, 9.5px)",
                      letterSpacing: "0.18em",
                      fontWeight: 700,
                      color: "var(--school-subtle, #5e5747)",
                    }}
                  >
                    young innovators club
                  </span>
                </span>
              </Link>
            </div>

            {/* Colophon right: socials + copyright */}
            <div className="animate-wipe-copy flex flex-col items-end" style={{ gap: "0.15cqw" }}>
              <div className="flex items-center" style={{ gap: "0.25cqw" }}>
                {SOCIALS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[color:var(--school-ink-soft,rgba(35,46,107,0.72))] transition-colors hover:text-[color:var(--school-accent,#a8472d)] focus-visible:text-[color:var(--school-accent,#a8472d)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
                  >
                    <social.icon style={{ width: "max(1.35cqw, 16px)", height: "max(1.35cqw, 16px)" }} />
                  </a>
                ))}
              </div>
              <p
                className="select-text whitespace-nowrap"
                style={{
                  fontSize: "max(0.72cqw, 9.5px)",
                  lineHeight: 1.2,
                  letterSpacing: "0.02em",
                  color: "var(--school-muted-strong, #3e3a5c)",
                }}
              >
                yicdvp © 2026, crafted to spark
              </p>
            </div>
          </div>
        </div>

        {/* ── PLATE: the engraved schoolhouse ─────────────────────────── */}
        <div
          className="relative w-full overflow-hidden bg-[var(--school-bg,#f5ebd9)]"
          style={{ aspectRatio: "1280 / 720" }}
        >
          {/* Camera: zoom-out + short defocus */}
          <div className="school-zoom absolute inset-0">
            {/* Render pass: dark-mode "night print" filter lives here - one
                static raster, kept OUTSIDE the animated camera transform. */}
            <div className="school-night absolute inset-0">
              <img
                src={PLATE_URL}
                alt=""
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center"
                draggable={false}
              />

              {/* Bird flock: film-exact crop pinned over its baked twin in
                  the plate (pose A IS those pixels), two poses crossfade -
                  a stop-motion flutter that never ends. */}
              <div className="school-flock pointer-events-none absolute" style={OVERLAY_STYLE.flock}>
                <img
                  src={FLOCK_POSE_A_URL}
                  alt=""
                  width={520}
                  height={150}
                  loading="lazy"
                  decoding="async"
                  className="school-pose-a absolute inset-0 h-full w-full"
                  draggable={false}
                />
                <img
                  src={FLOCK_POSE_B_URL}
                  alt=""
                  width={520}
                  height={150}
                  loading="lazy"
                  decoding="async"
                  className="school-pose-b absolute inset-0 h-full w-full"
                  draggable={false}
                />
              </div>

              {/* Ink strips: torn-print ornaments slide in at the reveal's
                  final beat, landing on their film positions. */}
              <img
                src={SWIRL_TL_URL}
                alt=""
                width={710}
                height={80}
                loading="lazy"
                decoding="async"
                className="school-swirl-tl pointer-events-none absolute"
                style={OVERLAY_STYLE.swarmTl}
                draggable={false}
              />
              <img
                src={SWIRL_TR_URL}
                alt=""
                width={220}
                height={60}
                loading="lazy"
                decoding="async"
                className="school-swirl-tr pointer-events-none absolute"
                style={OVERLAY_STYLE.swirlTr}
                draggable={false}
              />
              <img
                src={LEAF_BL_URL}
                alt=""
                width={78}
                height={70}
                loading="lazy"
                decoding="async"
                className="school-leaf-bl pointer-events-none absolute"
                style={OVERLAY_STYLE.leafBl}
                draggable={false}
              />
            </div>
          </div>

          {/* Vignette + hairline rules sit outside the zoom (static frame). */}
          <div className="school-vignette pointer-events-none absolute inset-0" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ height: 1, background: "var(--school-line, rgba(35,46,107,0.26))" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{ height: 1, background: "var(--school-line, rgba(35,46,107,0.26))" }}
          />
        </div>

        {/* ── BAND 2: colophon strip (4-col CSS Grid, zero overlap/clipping) ─ */}
        <div
          className="relative z-10 w-full"
          style={{
            minHeight: "11.5625cqw",
            paddingInline: BAND_PADDING,
            paddingTop: "1.05cqw",
            paddingBottom: "1.35cqw",
          }}
        >
          <div
            className="grid w-full items-start"
            style={{
              gridTemplateColumns:
                "minmax(148px, 15cqw) minmax(156px, 16cqw) minmax(0, 1fr) minmax(308px, 31cqw)",
              columnGap: "2.2cqw",
            }}
          >
            {/* Col 1 — Menu (two compact printed columns of links) */}
            <nav aria-label="Footer navigation" className="animate-wipe-menu min-w-0">
              <p
                className="uppercase select-text"
                style={{
                  fontSize: "max(0.72cqw, 9.5px)",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  color: "var(--school-heading, #635b49)",
                  marginBottom: "0.4cqw",
                }}
              >
                Menu
              </p>
              <ul className="grid grid-cols-2 gap-x-3">
                {MENU_LINKS.map((item) => (
                  <li key={item.label} className="leading-none">
                    <Link
                      to={item.to}
                      onMouseEnter={() => handleLinkPrefetch(item.to)}
                      onFocus={() => handleLinkPrefetch(item.to)}
                      onClick={(e) => handleLinkClick(e, item.to)}
                      className="school-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Col 2 — Explore */}
            <nav aria-label="Footer explore links" className="animate-wipe-legals min-w-0">
              <p
                className="uppercase select-text"
                style={{
                  fontSize: "max(0.72cqw, 9.5px)",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  color: "var(--school-heading, #635b49)",
                  marginBottom: "0.4cqw",
                }}
              >
                Explore
              </p>
              <ul className="flex flex-col">
                {EXPLORE_LINKS.map((item) => (
                  <li key={item.label} className="leading-none">
                    <Link
                      to={item.to}
                      onMouseEnter={() => handleLinkPrefetch(item.to)}
                      onFocus={() => handleLinkPrefetch(item.to)}
                      onClick={(e) => handleLinkClick(e, item.to)}
                      className="school-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Col 3 — Description (flows naturally inside minmax(0, 1fr)) */}
            <p
              className="animate-wipe-desc min-w-0 select-text"
              style={{
                fontSize: "max(0.95cqw, 11.5px)",
                lineHeight: 1.45,
                color: "var(--school-subtle, #5e5747)",
                letterSpacing: "-0.003em",
              }}
            >
              A young innovators club at Dharmapala Vidyalaya, Pannipitiya. We build and celebrate student tech:
              workshops, hackathons, projects and shared wins.
            </p>

            {/* Col 4 — Newsletter (mounts only when isStageLayout is true) */}
            <div className="animate-wipe-legals min-w-0 flex flex-col">
              {isStageLayout && (
                <>
                  <p
                    className="uppercase select-text"
                    style={{
                      fontSize: "max(0.72cqw, 9.5px)",
                      letterSpacing: "0.16em",
                      fontWeight: 700,
                      color: "var(--school-heading, #635b49)",
                      marginBottom: "0.55cqw",
                    }}
                  >
                    Newsletter
                  </p>
                  {nlPhase === "success" ? (
                    <p
                      className="select-text"
                      style={{
                        fontSize: "max(0.9cqw, 11px)",
                        lineHeight: 1.3,
                        fontWeight: 600,
                        color: "var(--school-ink, #232e6b)",
                      }}
                    >
                      {nlMessage}
                    </p>
                  ) : (
                    <>
                      <form className="flex items-center" style={{ gap: "0.55cqw" }} onSubmit={handleNewsletterSubmit}>
                        <input
                          type="email"
                          value={nlEmail}
                          onChange={(e) => setNlEmail(e.target.value)}
                          placeholder="you@example.com"
                          aria-label="Email address"
                          autoComplete="email"
                          className="min-h-[44px] min-w-0 flex-1 select-text rounded-full border outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
                          style={{
                            background: "color-mix(in srgb, var(--school-bg, #f5ebd9) 78%, transparent)",
                            borderColor: "color-mix(in srgb, var(--school-subtle, #5e5747) 42%, transparent)",
                            color: "var(--school-ink, #232e6b)",
                            fontSize: "max(0.86cqw, 12px)",
                            padding: "0.45cqw 1cqw",
                          }}
                        />
                        <button
                          type="submit"
                          disabled={nlPhase === "sending" || (!nlToken && !nlTokenError)}
                          className="min-h-[44px] shrink-0 rounded-full font-bold transition-all hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)] disabled:cursor-not-allowed disabled:opacity-55"
                          style={{
                            background: "var(--school-ink, #232e6b)",
                            color: "var(--school-bg, #f5ebd9)",
                            fontSize: "max(0.82cqw, 12px)",
                            padding: "0.45cqw 1.25cqw",
                          }}
                        >
                          {nlPhase === "sending" ? "Sending" : "Subscribe"}
                        </button>
                      </form>
                      <div className="mt-2">
                        <Turnstile
                          key={nlTokenKey}
                          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                          size="flexible"
                          onSuccess={(token) => {
                            setNlTokenState({
                              token: token || null,
                              error: false,
                              layout: isStageLayout,
                              gen: layoutGen,
                            });
                          }}
                          onError={() => {
                            setNlTokenState({
                              token: null,
                              error: true,
                              layout: isStageLayout,
                              gen: layoutGen,
                            });
                          }}
                        />
                      </div>
                      {nlPhase === "error" && (
                        <p
                          role="status"
                          className="mt-1 select-text"
                          style={{
                            fontSize: "max(0.8cqw, 11px)",
                            lineHeight: 1.3,
                            color: "var(--school-error, #a11f18)",
                          }}
                        >
                          {nlMessage}
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Static film grain over the whole stage (above bands, below
            nothing interactive): unifies plate + paper into one print. */}
        <div aria-hidden="true" className="school-grain pointer-events-none absolute inset-0" />
      </div>

      {/* Mobile: stacked static version <1024px */}
      <div className="bg-[var(--school-bg,#f5ebd9)] px-5 py-8 text-[var(--school-ink,#232e6b)] lg:hidden">
        <div className="relative mx-auto mb-7 max-w-xl overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="school-night">
            <img
              src={PLATE_URL}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="block aspect-[16/9] w-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <picture className="contents">
              <source type="image/avif" srcSet={clubLogoAvif} />
              <source type="image/webp" srcSet={clubLogo} />
              <img
                src={clubLogo}
                alt="Young Innovators Club logo"
                width={1024}
                height={1024}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-10 w-auto object-contain"
              />
            </picture>
            <picture className="contents">
              <source type="image/avif" srcSet={schoolLogoAvif} />
              <source type="image/webp" srcSet={schoolLogo} />
              <img
                src={schoolLogo}
                alt="Dharmapala Vidyalaya logo"
                width={200}
                height={200}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-10 w-auto object-contain"
              />
            </picture>
          </div>
          <div>
            <p className="font-display text-2xl font-black lowercase leading-none tracking-tighter">yicdvp</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--school-subtle,#5e5747)]">
              young innovators club
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[var(--school-subtle,#5e5747)]">
          A young innovators club at Dharmapala Vidyalaya, Pannipitiya. We build and celebrate student tech:
          workshops, hackathons, projects and shared wins.
        </p>

        <div className="mt-6 grid grid-cols-1 xs:grid-cols-2 gap-6">
          <nav aria-label="Footer navigation">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--school-heading,#635b49)]">Menu</p>
            <ul className="mt-1 space-y-0.5">
              {MENU_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onMouseEnter={() => handleLinkPrefetch(item.to)}
                    onFocus={() => handleLinkPrefetch(item.to)}
                    onClick={(e) => handleLinkClick(e, item.to)}
                    className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-[var(--school-strong,#27327a)] hover:text-[var(--school-accent,#a8472d)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Footer explore links">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--school-heading,#635b49)]">Explore</p>
            <ul className="mt-1 space-y-0.5">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onMouseEnter={() => handleLinkPrefetch(item.to)}
                    onFocus={() => handleLinkPrefetch(item.to)}
                    onClick={(e) => handleLinkClick(e, item.to)}
                    className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-[var(--school-strong,#27327a)] hover:text-[var(--school-accent,#a8472d)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--school-ink-soft,rgba(35,46,107,0.72))] transition-colors hover:text-[var(--school-accent,#a8472d)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)]"
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        {/* Mobile newsletter block - reactive via useMediaQuery("(min-width: 1024px)") */}
        {!isStageLayout && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--school-heading,#635b49)]">
              Newsletter
            </p>
            {nlPhase === "success" ? (
              <p className="mt-2 text-[15px] font-bold text-[var(--school-strong,#27327a)]">{nlMessage}</p>
            ) : (
              <>
                <form className="mt-2 flex items-center gap-2" onSubmit={handleNewsletterSubmit}>
                  <input
                    type="email"
                    value={nlEmail}
                    onChange={(e) => setNlEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    autoComplete="email"
                    className="min-h-[44px] min-w-0 flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-[15px] text-[var(--school-ink,#232e6b)] outline-none transition-colors placeholder:text-[var(--school-subtle,#5e5747)] focus:border-[var(--school-accent,#a8472d)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)] dark:border-white/15 dark:bg-white/10"
                  />
                  <button
                    type="submit"
                    disabled={nlPhase === "sending" || (!nlToken && !nlTokenError)}
                    className="min-h-[44px] shrink-0 rounded-full bg-[var(--school-ink,#232e6b)] px-4 py-2.5 text-[13px] font-bold text-[var(--school-bg,#f5ebd9)] transition-all hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--school-accent,#a8472d)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {nlPhase === "sending" ? "Sending" : "Subscribe"}
                  </button>
                </form>
                <div className="mt-3">
                  <Turnstile
                    key={nlTokenKey}
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    size="compact"
                    onSuccess={(token) => {
                      setNlTokenState({
                        token: token || null,
                        error: false,
                        layout: isStageLayout,
                        gen: layoutGen,
                      });
                    }}
                    onError={() => {
                      setNlTokenState({
                        token: null,
                        error: true,
                        layout: isStageLayout,
                        gen: layoutGen,
                      });
                    }}
                  />
                </div>
                {nlPhase === "error" && (
                  <p role="status" className="mt-2 text-xs leading-relaxed text-[var(--school-error,#a11f18)]">
                    {nlMessage}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <p className="mt-5 text-xs text-[var(--school-muted-strong,#3e3a5c)]">yicdvp © 2026, crafted to spark</p>
      </div>
    </footer>
  );
};

export default Footer;
