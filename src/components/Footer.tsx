import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { Turnstile } from "@/components/Turnstile";
import { sanitizeEmail } from "@/lib/sanitize";
import { clubLogo, schoolLogo } from "@/components/ClubLogo";

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
 * pixels, so the takeover from baked birds to animated flock is seamless
 * on every replay.
 *
 * Performance: everything animates compositor-safe transform/opacity (the
 * one exception is the 1.2s intro defocus, allowed as a short reveal).
 * The stage renders only from `lg` up; smaller screens get a stacked,
 * static version with a lazy plate image - no loops on phones.
 * Reduced motion: the site-wide clamp one-shots every animation, which
 * parks the zoom/defocus/strips on their final states and freezes the
 * flock at pose A; JS additionally skips nothing (no video here).
 */

/* The stage (proportional typography etc.) is only rendered at lg+. */
const STAGE_MEDIA =
  typeof window === "undefined" ? null : window.matchMedia("(min-width: 1024px)");

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

/* Band geometry as fractions of the 1280x940 stage. */
const BAND = { top: "7.66%", plate: "76.6%", bottom: "15.74%" };
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

  const [animKey, setAnimKey] = useState(0);
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
  const [nlToken, setNlToken] = useState<string | null>(null);
  const [nlTokenError, setNlTokenError] = useState(false);
  const [nlTokenKey, setNlTokenKey] = useState(0);
  const [nlPhase, setNlPhase] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [nlMessage, setNlMessage] = useState("");

  const resetNewsletterTurnstile = useCallback(() => {
    // Turnstile tokens are single-use: remount the widget and get a fresh one.
    setNlToken(null);
    setNlTokenKey((k) => k + 1);
  }, []);

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

  // The colophon strip's proportional type only reads well at lg+; the form
  // mounts exactly once per page load (shared state + one Turnstile token)
  // wherever the layout puts it - remounting on resize would discard typed
  // text for no real benefit, since the whole footer treats the stage/mobile
  // split as a load-time decision (see STAGE_MEDIA).
  const isStageLayout = STAGE_MEDIA?.matches ?? false;

  // The reveal restarts via re-keying the art layers: the zoom/defocus and
  // strip wipes replay, and the flock entrance replays. The newsletter stays
  // a sibling of the keyed layers so a replay can't wipe half-typed input.
  const triggerReplay = useCallback(() => {
    setAnimKey((prev) => prev + 1);
  }, []);

  // Reference behavior, upgraded for a bottom-of-page footer: the reveal
  // (zoom + text wipes + strip slide-ins) plays on arrival, but only on a
  // real arrival - recrossing threshold 0.25 while staying in view (lazy
  // images growing the page, scroll jitter) must NOT restart it.
  const departedRef = useRef(true);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            departedRef.current = true;
            return;
          }
          // In-view ticks (threshold jitter while staying visible) are
          // ignored; only a full departure + return reruns the story.
          if (departedRef.current) {
            departedRef.current = false;
            setArmed(true);
            triggerReplay();
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerReplay]);

  return (
    <footer
      ref={containerRef}
      data-armed={armed ? "true" : "false"}
      data-site-footer
      aria-label="YICDVP schoolhouse print footer"
      className="relative w-full select-none overflow-hidden"
    >
      {/* Cream prospectus stage: brand strip (7.66%) / plate (76.6%) /
          colophon strip (15.74%) = 1280x940 reference box. Rendered lg-up
          only; smaller screens use the stacked block. */}
      <div
        className="relative mx-auto hidden w-full overflow-hidden bg-[var(--school-bg,#f5ebd9)] lg:block"
        style={{ aspectRatio: "1280 / 940", containerType: "inline-size" }}
      >
        {/* ── BAND 1: brand strip ─────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{ height: BAND.top, paddingInline: BAND_PADDING }}
        >
          <div key={`band1-${animKey}`} className="flex h-full items-center justify-between">
            {/* Logo lockup (reused DOM from the previous footer) */}
            <div className="animate-wipe-logo flex items-center">
              <Link
                to="/"
                aria-label="YICDVP home"
                className="flex h-full items-center focus-visible:outline focus-visible:outline-[color:var(--school-accent,#a8472d)]"
              >
                <div className="flex items-center" style={{ gap: "0.6cqw", height: "4.7cqw" }}>
                  <img src={clubLogo} alt="Young Innovators Club logo" draggable={false} className={LOGO_IMG_CLASS} />
                  <img src={schoolLogo} alt="Dharmapala Vidyalaya logo" draggable={false} className={LOGO_IMG_CLASS} />
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
                      color: "var(--school-subtle, #8b8471)",
                    }}
                  >
                    young innovators club
                  </span>
                </span>
              </Link>
            </div>

            {/* Colophon right: socials + copyright */}
            <div className="animate-wipe-copy flex flex-col items-end" style={{ gap: "0.35cqw" }}>
              <div className="flex items-center" style={{ gap: "0.75cqw" }}>
                {SOCIALS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="text-[color:var(--school-ink-soft,rgba(35,46,107,0.72))] transition-colors hover:text-[color:var(--school-accent,#a8472d)] focus-visible:text-[color:var(--school-accent,#a8472d)] focus-visible:outline focus-visible:outline-[color:var(--school-accent,#a8472d)]"
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
          className="absolute inset-x-0 overflow-hidden bg-[var(--school-bg,#f5ebd9)]"
          style={{ top: BAND.top, height: BAND.plate }}
        >
          {/* Camera: zoom-out + short defocus. Re-keyed on replay. */}
          <div key={`zoom-${animKey}`} className="school-zoom absolute inset-0">
            {/* Render pass: dark-mode "night print" filter lives here - one
                static raster, kept OUTSIDE the animated camera transform. */}
            <div className="school-night absolute inset-0">
              <img
                src={PLATE_URL}
                alt=""
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
                  loading="lazy"
                  decoding="async"
                  className="school-pose-a absolute inset-0 h-full w-full"
                  draggable={false}
                />
                <img
                  src={FLOCK_POSE_B_URL}
                  alt=""
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
                loading="lazy"
                decoding="async"
                className="school-swirl-tl pointer-events-none absolute"
                style={OVERLAY_STYLE.swarmTl}
                draggable={false}
              />
              <img
                src={SWIRL_TR_URL}
                alt=""
                loading="lazy"
                decoding="async"
                className="school-swirl-tr pointer-events-none absolute"
                style={OVERLAY_STYLE.swirlTr}
                draggable={false}
              />
              <img
                src={LEAF_BL_URL}
                alt=""
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

        {/* ── BAND 2: colophon strip ──────────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: BAND.bottom, paddingInline: BAND_PADDING, paddingTop: "1.05cqw" }}
        >
          <div key={`band2-${animKey}`} className="flex h-full items-start" style={{ gap: "2.6cqw" }}>
            {/* Menu column: two compact printed columns of links */}
            <nav aria-label="Footer navigation" className="animate-wipe-menu shrink-0" style={{ width: "17cqw" }}>
              <p
                className="uppercase select-text"
                style={{
                  fontSize: "max(0.72cqw, 9.5px)",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  color: "var(--school-heading, #998f7b)",
                  marginBottom: "0.65cqw",
                }}
              >
                Menu
              </p>
              <ul className="flex flex-col" style={{ gap: "0.42cqw" }}>
                {MENU_LINKS.map((item) => (
                  <li key={item.label} className="leading-none">
                    <Link to={item.to} className="school-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Explore column */}
            <nav aria-label="Footer explore links" className="animate-wipe-legals shrink-0" style={{ width: "14cqw" }}>
              <p
                className="uppercase select-text"
                style={{
                  fontSize: "max(0.72cqw, 9.5px)",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  color: "var(--school-heading, #998f7b)",
                  marginBottom: "0.65cqw",
                }}
              >
                Explore
              </p>
              <ul className="flex flex-col" style={{ gap: "0.42cqw" }}>
                {EXPLORE_LINKS.map((item) => (
                  <li key={item.label} className="leading-none">
                    <Link to={item.to} className="school-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Description */}
            <p
              className="animate-wipe-desc flex-1 select-text"
              style={{
                fontSize: "max(0.95cqw, 11.5px)",
                lineHeight: 1.4,
                color: "var(--school-subtle, #8b8471)",
                letterSpacing: "-0.003em",
              }}
            >
              <span className="block">A young innovators club at Dharmapala Vidyalaya, Pannipitiya.</span>
              <span className="block">We build and celebrate student tech: workshops, hackathons,</span>
              <span className="block">projects and shared wins.</span>
            </p>

            {/* Newsletter lives OUTSIDE the keyed art layers (sibling below)
                so replays never wipe half-typed input. */}
          </div>
        </div>

        {/* Newsletter box: absolute sibling over the colophon strip's right
            side. Renders only when the stage layout is the mounted one
            (isStageLayout) so the page carries exactly one Turnstile widget. */}
        {isStageLayout && (
          <div
            className="animate-wipe-legals absolute z-10 flex flex-col"
            style={{
              left: "64.5%",
              right: BAND_PADDING,
              bottom: "0",
              height: BAND.bottom,
              paddingTop: "1.05cqw",
            }}
          >
            <p
              className="uppercase select-text"
              style={{
                fontSize: "max(0.72cqw, 9.5px)",
                letterSpacing: "0.16em",
                fontWeight: 700,
                color: "var(--school-heading, #998f7b)",
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
                    className="min-w-0 flex-1 select-text rounded-full border outline-none transition-colors focus-visible:outline-[color:var(--school-accent,#a8472d)]"
                    style={{
                      background: "color-mix(in srgb, var(--school-bg, #f5ebd9) 78%, transparent)",
                      borderColor: "color-mix(in srgb, var(--school-subtle, #8b8471) 42%, transparent)",
                      color: "var(--school-ink, #232e6b)",
                      fontSize: "max(0.86cqw, 11px)",
                      padding: "0.45cqw 1cqw",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={nlPhase === "sending" || (!nlToken && !nlTokenError)}
                    className="shrink-0 rounded-full font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
                    style={{
                      background: "var(--school-ink, #232e6b)",
                      color: "var(--school-bg, #f5ebd9)",
                      fontSize: "max(0.82cqw, 10.5px)",
                      padding: "0.45cqw 1.25cqw",
                    }}
                  >
                    {nlPhase === "sending" ? "Sending" : "Subscribe"}
                  </button>
                </form>
                <Turnstile
                  key={nlTokenKey}
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  size="flexible"
                  onSuccess={(token) => {
                    setNlToken(token || null);
                    setNlTokenError(false);
                  }}
                  onError={() => {
                    setNlToken(null);
                    setNlTokenError(true);
                  }}
                />
                {nlPhase === "error" && (
                  <p
                    role="status"
                    className="select-text"
                    style={{ fontSize: "max(0.8cqw, 10px)", lineHeight: 1.3, color: "#b3261e" }}
                  >
                    {nlMessage}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Static film grain over the whole stage (above bands, below
            nothing interactive): unifies plate + paper into one print. */}
        <div aria-hidden="true" className="school-grain pointer-events-none absolute inset-0" />
      </div>

      {/* Mobile: the stage's proportional type only reads well on large
          screens, so <lg widths get a readable stacked version of the
          same content, topped by a lazy static plate image (no looping
          animations - nothing to jank on phones). */}
      <div className="bg-[var(--school-bg,#f5ebd9)] px-5 py-8 text-[var(--school-ink,#232e6b)] lg:hidden">
        <div className="relative mx-auto mb-7 max-w-xl overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="school-night">
            <img
              src={PLATE_URL}
              alt=""
              loading="lazy"
              decoding="async"
              className="block aspect-[16/9] w-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src={clubLogo} alt="Young Innovators Club logo" draggable={false} className="h-10 w-auto object-contain" />
            <img src={schoolLogo} alt="Dharmapala Vidyalaya logo" draggable={false} className="h-10 w-auto object-contain" />
          </div>
          <div>
            <p className="font-display text-2xl font-black lowercase leading-none tracking-tighter">yicdvp</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--school-subtle,#8b8471)]">
              young innovators club
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[var(--school-subtle,#8b8471)]">
          A young innovators club at Dharmapala Vidyalaya, Pannipitiya. We build and celebrate student tech:
          workshops, hackathons, projects and shared wins.
        </p>

        <div className="mt-6 grid grid-cols-1 xs:grid-cols-2 gap-6">
          <nav aria-label="Footer navigation">
            <p className="text-xs text-[var(--school-heading,#998f7b)]">Menu</p>
            <ul className="mt-2 space-y-2">
              {MENU_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[15px] font-medium text-[var(--school-strong,#27327a)] hover:text-[var(--school-accent,#a8472d)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Footer explore links">
            <p className="text-xs text-[var(--school-heading,#998f7b)]">Explore</p>
            <ul className="mt-2 space-y-2">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[15px] font-medium text-[var(--school-strong,#27327a)] hover:text-[var(--school-accent,#a8472d)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="text-[var(--school-ink-soft,rgba(35,46,107,0.72))] transition-colors hover:text-[var(--school-accent,#a8472d)]"
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        {/* Mobile newsletter block - gated on !isStageLayout so the page mounts
            exactly one Turnstile widget per page load, whichever layout is
            active (the stage/mobile split is a load-time decision, see
            STAGE_MEDIA, so no resize-time remount churn). */}
        {!isStageLayout && (
          <div className="mt-7">
            <p className="text-xs text-[var(--school-heading,#998f7b)]">Newsletter</p>
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
                    className="min-w-0 flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-[15px] text-[var(--school-ink,#232e6b)] outline-none transition-colors placeholder:text-[var(--school-subtle,#8b8471)] focus:border-[var(--school-accent,#a8472d)] dark:border-white/15 dark:bg-white/10"
                  />
                  <button
                    type="submit"
                    disabled={nlPhase === "sending" || (!nlToken && !nlTokenError)}
                    className="shrink-0 rounded-full bg-[var(--school-ink,#232e6b)] px-4 py-2.5 text-[13px] font-bold text-[var(--school-bg,#f5ebd9)] transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
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
                      setNlToken(token || null);
                      setNlTokenError(false);
                    }}
                    onError={() => {
                      setNlToken(null);
                      setNlTokenError(true);
                    }}
                  />
                </div>
                {nlPhase === "error" && (
                  <p role="status" className="mt-2 text-xs leading-relaxed text-[#b3261e]">
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
