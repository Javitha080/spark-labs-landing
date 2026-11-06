import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { clubLogo, schoolLogo } from "@/components/ClubLogo";

/**
 * Footer - the animated woodblock footer, ported from the reference
 * project ("replicate-footer-animation-project") and re-branded for
 * YICDVP. Three layers over one 1304x720 stage (container-query units
 * keep every element proportional to the stage width):
 *
 *   L1  plate image (bridge and mountain pagoda over the river) with a
 *       top-down mist reveal - re-run whenever `animKey` bumps;
 *   L2  the 60fps scene video (default) - `preload="none"` + poster, so
 *       decoding and playback start only once the footer is armed by the
 *       viewport observer AND the stage is actually rendered (lg+);
 *       a missing/undecodable video silently degrades to the layered
 *       CSS/SVG scene below;
 *   L3  real interactive DOM typography - our logos, brand line,
 *       description, copyright, nav columns (react-router Links) and
 *       socials - wiped in left-to-right at the reference's coordinates.
 *
 * Once the video ends (or in the layered fallback) woodblock birds keep
 * crossing and boats glide the river - pure CSS keyframes from index.css.
 *
 * Theming: every surface/text colour comes from the `--hashi-*` palette
 * defined in index.css (:root light values, .dark overrides). Dark mode
 * adds a scrim above the artwork (below the type) for contrast.
 *
 * Performance: the stage (artwork + video + animated type) renders only
 * from `lg` up; smaller screens get a stacked, static version of the same
 * content plus a lazy plate image - no video decoding, no CSS loops. The
 * old hover controller bar is gone; the reveal still replays on arrival
 * via the IntersectionObserver.
 *
 * Reduced motion: video autoplay is skipped and the global clamp parks
 * the loops at their rest frames; the mist and wipes land instantly on
 * their final states via the RM overrides in index.css.
 */

const FOOTER_REDUCED =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The stage (video etc.) is only rendered at lg breakpoint (1024px+). */
const STAGE_MEDIA =
  typeof window === "undefined" ? null : window.matchMedia("(min-width: 1024px)");

const SCENE_VIDEO_URL = "/assets/hashi-scene.mp4";
const SCENE_POSTER_URL = "/assets/hashi-poster.webp";
const CLEAN_BG_URL = "/assets/hashi-clean-bg.webp";
const BOAT_LEFT_URL = "/assets/hashi-boat-left.webp";
const BOAT_RIGHT_URL = "/assets/hashi-boat-right.webp";

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

/* Woodblock SVG bird silhouettes from the reference footer: continuous
   ambient flight after the video ends or in the layered fallback.
   Colours come from the footer palette vars so they read on both themes. */
const WoodblockBirdSvg = ({
  className = "w-7 h-5",
  flapDuration = "0.65s",
  flapDelay = "0s",
  variant = 1,
  style,
}: {
  className?: string;
  flapDuration?: string;
  flapDelay?: string;
  variant?: 1 | 2 | 3;
  style?: CSSProperties;
}) => (
  <svg
    viewBox="0 0 48 32"
    fill="none"
    className={className}
    aria-hidden="true"
    style={{
      animation: `hashiBirdFlap ${flapDuration} ease-in-out ${flapDelay} infinite`,
      ...style,
    }}
  >
    {variant === 1 && (
      <g>
        <path d="M4 18C10 9 17 7 23 15C28 7 36 5 44 12C37 13 31 16 26 21C19 22 12 20 4 18Z" fill="var(--hashi-bird-1, #4a35d7)" />
        <path d="M14 17C18 14 23 15 27 18C23 19 18 19 14 17Z" fill="var(--hashi-bird-belly, #fafbef)" />
      </g>
    )}
    {variant === 2 && (
      <g>
        <path d="M3 14C11 6 19 8 24 16C29 9 37 7 45 14C37 15 30 18 25 22C18 21 10 18 3 14Z" fill="var(--hashi-bird-2, #3b28b8)" />
        <path d="M16 16C20 14 24 15 28 18C23 19 19 18 16 16Z" fill="var(--hashi-bird-belly, #fafbef)" />
      </g>
    )}
    {variant === 3 && (
      <path d="M6 16C13 11 19 12 24 17C29 12 35 11 42 16C35 15 29 17 24 20C19 17 13 15 6 16Z" fill="var(--hashi-bird-3, #261765)" />
    )}
  </svg>
);

const FLOCK_BIRDS = [
  { left: "0%", top: "10%", size: "1.6cqw", variant: 3 as const, flapDuration: "0.8s", flapDelay: "0s" },
  { left: "26%", top: "34%", size: "3.4cqw", variant: 1 as const, flapDuration: "0.58s", flapDelay: "0.1s" },
  { left: "42%", top: "24%", size: "3.1cqw", variant: 2 as const, flapDuration: "0.64s", flapDelay: "0.25s" },
  { left: "38%", top: "58%", size: "3.2cqw", variant: 1 as const, flapDuration: "0.61s", flapDelay: "0.4s" },
  { left: "55%", top: "48%", size: "3.5cqw", variant: 2 as const, flapDuration: "0.55s", flapDelay: "0.18s" },
  { left: "68%", top: "30%", size: "3.3cqw", variant: 1 as const, flapDuration: "0.62s", flapDelay: "0.32s" },
  { left: "88%", top: "44%", size: "1.5cqw", variant: 3 as const, flapDuration: "0.75s", flapDelay: "0.05s" },
];

const LOGO_IMG_CLASS = "h-full w-auto object-contain select-none";

const Footer = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [animKey, setAnimKey] = useState(0);
  const [armed, setArmed] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // A missing/undecodable video silently degrades to the layered scene.
  const hybridLive = !videoFailed;

  // The reveal restarts via re-keying every layer: the mist plate and
  // wipes replay, and the video effect below replays the fresh element.
  const triggerReplay = useCallback(() => {
    setVideoEnded(false);
    setAnimKey((prev) => prev + 1);
  }, []);

  // Playback is started only when the footer is armed (in the viewport)
  // and the stage is actually on screen (lg+): preload="none" keeps the
  // ~1.3MB scene off the wire until then, and phones never decode it.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !armed || !hybridLive || FOOTER_REDUCED || !STAGE_MEDIA?.matches) return;
    vid.play().catch(() => setVideoFailed(true));
  }, [animKey, videoFailed, armed, hybridLive]);

  // Reference behavior, upgraded for a bottom-of-page footer: the reveal
  // (mist slide + text wipes + fresh flights) replays on EVERY arrival,
  // including the first one - the mount-time run happens offscreen here.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setArmed(true);
          triggerReplay();
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
      aria-label="YICDVP animated footer"
      className="relative w-full select-none overflow-hidden"
    >
      {/* 1304 x 720 stage with container-query units (cqw scales type,
          icons and boat sizes with the stage width, like the reference).
          Rendered lg-up only; smaller screens use the stacked block. */}
      <div
        className="relative mx-auto hidden w-full overflow-hidden bg-[var(--hashi-bg,#fafbef)] lg:block"
        style={{ aspectRatio: "1304 / 720", containerType: "inline-size" }}
      >
        {/* LAYER 1: clean landscape plate + top-to-bottom mist reveal */}
        <div
          key={`bg-${animKey}`}
          className="hashi-mist-mask pointer-events-none absolute inset-0 h-full w-full"
        >
          <img
            src={CLEAN_BG_URL}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center"
            draggable={false}
          />
        </div>

        {/* Ambient woodblock birds: layered fallback, or after the 60fps
            scene video finishes. Wings flap while the flock drifts. */}
        {(!hybridLive || videoEnded) && (
          <div
            key={`flock-${animKey}-${videoEnded ? "ambient" : "init"}`}
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ zIndex: 2 }}
          >
            <div
              className="absolute"
              style={{
                top: "29%",
                left: "4%",
                width: "22%",
                height: "14%",
                animation: "hashiFlockAcross 11s linear infinite",
              }}
            >
              <div className="relative h-full w-full">
                {FLOCK_BIRDS.map((bird, i) => (
                  <div key={i} className="absolute" style={{ left: bird.left, top: bird.top }}>
                    <WoodblockBirdSvg
                      className="h-auto"
                      style={{ width: bird.size }}
                      variant={bird.variant}
                      flapDuration={bird.flapDuration}
                      flapDelay={bird.flapDelay}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Layered-fallback extras: the river boats from the actual scene. */}
        {!hybridLive && (
          <div
            key={`boats-${animKey}`}
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ zIndex: 2 }}
          >
            <img
              src={BOAT_LEFT_URL}
              alt=""
              draggable={false}
              className="absolute"
              style={{ left: "6%", bottom: "17%", width: "9cqw", animation: "hashiBoatLeftGlide 8s ease-in-out infinite" }}
            />
            <img
              src={BOAT_RIGHT_URL}
              alt=""
              draggable={false}
              className="absolute"
              style={{ right: "8%", bottom: "13%", width: "7.5cqw", animation: "hashiBoatRightGlide 9.5s ease-in-out infinite" }}
            />
          </div>
        )}

        {/* LAYER 2: the 60fps clean scene video (bridge reveal, birds,
            gliding boats). poster + preload none => nothing decodes until
            it actually plays. */}
        {hybridLive && (
          <video
            key={`vid-${animKey}`}
            ref={videoRef}
            src={SCENE_VIDEO_URL}
            poster={SCENE_POSTER_URL}
            muted
            playsInline
            preload="none"
            onEnded={() => setVideoEnded(true)}
            onError={() => setVideoFailed(true)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            style={{ zIndex: 3 }}
          />
        )}

        {/* Dark-mode scrim between the artwork and the type so the light
            DOM text keeps contrast in the site's dark theme. Light theme
            shows the plate untouched. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            zIndex: 4,
            background:
              "linear-gradient(180deg, rgba(13, 9, 30, 0.5) 0%, rgba(13, 9, 30, 0.6) 55%, rgba(13, 9, 30, 0.82) 100%)",
          }}
        />

        {/* LAYER 3: real interactive DOM typography at the reference's
            measured coordinates. The stacked block below replaces it on
            <lg screens where these proportional sizes get too small. */}
        <div key={`dom-${animKey}`} className="absolute inset-0 hidden h-full w-full lg:block" style={{ zIndex: 10 }}>
          {/* Top-left logos + brand (left 3.067%, top 9.444%) */}
          <div
            className="animate-wipe-logo absolute flex items-center"
            style={{ left: "3.067%", top: "9.444%", height: "5.556%" }}
          >
            <Link
              to="/"
              aria-label="YICDVP home"
              className="flex h-full items-center focus-visible:outline focus-visible:outline-[color:var(--hashi-accent,#4a35d7)]"
            >
              <div className="flex h-full items-center" style={{ gap: "0.6cqw" }}>
                <img src={clubLogo} alt="Young Innovators Club logo" draggable={false} className={LOGO_IMG_CLASS} />
                <img src={schoolLogo} alt="Dharmapala Vidyalaya logo" draggable={false} className={LOGO_IMG_CLASS} />
              </div>
              <span className="flex flex-col" style={{ marginLeft: "0.75cqw" }}>
                <span
                  className="font-display font-black lowercase leading-none tracking-tighter"
                  style={{ fontSize: "max(1.8cqw, 20px)", color: "var(--hashi-ink, #261765)" }}
                >
                  yicdvp
                </span>
                <span
                  className="uppercase"
                  style={{
                    marginTop: "0.25cqw",
                    fontSize: "max(0.72cqw, 9.5px)",
                    letterSpacing: "0.18em",
                    fontWeight: 700,
                    color: "var(--hashi-subtle, #8e9086)",
                  }}
                >
                  young innovators club
                </span>
              </span>
            </Link>
          </div>

          {/* Left 3-line description (left 3.067%, top 16.25%) */}
          <p
            className="animate-wipe-desc absolute select-text"
            style={{
              left: "3.067%",
              top: "16.25%",
              fontSize: "max(0.945cqw, 11px)",
              lineHeight: 1.33,
              color: "var(--hashi-subtle, #8e9086)",
              letterSpacing: "-0.003em",
            }}
          >
            <span className="block whitespace-nowrap">A young innovators club at Dharmapala Vidyalaya,</span>
            <span className="block whitespace-nowrap">Pannipitiya. We build and celebrate student tech:</span>
            <span className="block whitespace-nowrap">workshops, hackathons, projects and shared wins.</span>
          </p>

          {/* Left copyright line (left 3.067%, top 29.72%) */}
          <div
            className="animate-wipe-copy absolute select-text whitespace-nowrap"
            style={{
              left: "3.067%",
              top: "29.72%",
              fontSize: "max(0.94cqw, 11px)",
              lineHeight: 1.2,
              color: "var(--hashi-muted-strong, #3a306a)",
              letterSpacing: "-0.004em",
            }}
          >
            yicdvp © 2026, crafted to spark
          </div>

          {/* Social icons (below the copyright line, same left edge) */}
          <div
            className="animate-wipe-legals absolute flex items-center"
            style={{ left: "3.067%", top: "36.8%", gap: "0.75cqw" }}
          >
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-[color:var(--hashi-ink-soft,rgba(38,23,101,0.72))] transition-colors hover:text-[color:var(--hashi-accent,#4a35d7)] focus-visible:text-[color:var(--hashi-accent,#4a35d7)] focus-visible:outline focus-visible:outline-[color:var(--hashi-accent,#4a35d7)]"
              >
                <social.icon style={{ width: "max(1.4cqw, 16px)", height: "max(1.4cqw, 16px)" }} />
              </a>
            ))}
          </div>

          {/* Right column 1: navigation (left 75.46%, top 9.58%) */}
          <nav
            aria-label="Footer navigation"
            className="animate-wipe-menu absolute"
            style={{ left: "75.46%", top: "9.58%" }}
          >
            <div
              className="select-text"
              style={{
                fontSize: "max(0.86cqw, 10.5px)",
                lineHeight: 1,
                color: "var(--hashi-heading, #93948b)",
                marginBottom: "1.35cqw",
              }}
            >
              Menu
            </div>
            <ul className="flex flex-col" style={{ gap: "0.96cqw" }}>
              {MENU_LINKS.map((item) => (
                <li key={item.label} className="leading-none">
                  <Link to={item.to} className="hashi-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right column 2: explore + legals (left 88.27%, top 9.58%) */}
          <nav
            aria-label="Footer explore links"
            className="animate-wipe-legals absolute"
            style={{ left: "88.27%", top: "9.58%" }}
          >
            <div
              className="select-text"
              style={{
                fontSize: "max(0.86cqw, 10.5px)",
                lineHeight: 1,
                color: "var(--hashi-heading, #93948b)",
                marginBottom: "1.35cqw",
              }}
            >
              Explore
            </div>
            <ul className="flex flex-col" style={{ gap: "0.96cqw" }}>
              {EXPLORE_LINKS.map((item) => (
                <li key={item.label} className="leading-none">
                  <Link to={item.to} className="hashi-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile: the stage's proportional type only reads well on large
          screens, so <lg widths get a readable stacked version of the
          same content, topped by a lazy static plate image (no video, no
          looping animations - nothing to jank on phones). */}
      <div className="bg-[var(--hashi-bg,#fafbef)] px-5 py-8 text-[var(--hashi-ink,#261765)] lg:hidden">
        <div className="relative mx-auto mb-7 max-w-xl overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          <img
            src={CLEAN_BG_URL}
            alt=""
            loading="lazy"
            decoding="async"
            className="block aspect-[16/9] w-full object-cover"
            draggable={false}
          />
          <div aria-hidden="true" className="absolute inset-0 hidden dark:block bg-[#0d091e]/55" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src={clubLogo} alt="Young Innovators Club logo" draggable={false} className="h-10 w-auto object-contain" />
            <img src={schoolLogo} alt="Dharmapala Vidyalaya logo" draggable={false} className="h-10 w-auto object-contain" />
          </div>
          <div>
            <p className="font-display text-2xl font-black lowercase leading-none tracking-tighter">yicdvp</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--hashi-subtle,#8e9086)]">
              young innovators club
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[var(--hashi-subtle,#8e9086)]">
          A young innovators club at Dharmapala Vidyalaya, Pannipitiya. We build and celebrate student tech:
          workshops, hackathons, projects and shared wins.
        </p>

        <div className="mt-6 grid grid-cols-1 xs:grid-cols-2 gap-6">
          <nav aria-label="Footer navigation">
            <p className="text-xs text-[var(--hashi-heading,#93948b)]">Menu</p>
            <ul className="mt-2 space-y-2">
              {MENU_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[15px] font-medium text-[var(--hashi-strong,#2e2266)] hover:text-[var(--hashi-accent,#4a35d7)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Footer explore links">
            <p className="text-xs text-[var(--hashi-heading,#93948b)]">Explore</p>
            <ul className="mt-2 space-y-2">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[15px] font-medium text-[var(--hashi-strong,#2e2266)] hover:text-[var(--hashi-accent,#4a35d7)]">
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
              className="text-[var(--hashi-ink-soft,rgba(38,23,101,0.72))] transition-colors hover:text-[var(--hashi-accent,#4a35d7)]"
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        <p className="mt-5 text-xs text-[var(--hashi-muted-strong,#3a306a)]">yicdvp © 2026, crafted to spark</p>
      </div>
    </footer>
  );
};

export default Footer;
