import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { RotateCcw, Sparkles, Play, Pause, Layers, Facebook, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import OptimizedImage from "@/components/common/OptimizedImage";
import { clubLogo, schoolLogo } from "@/components/ClubLogo";

/**
 * Footer - the animated woodblock footer, ported from the reference
 * project ("replicate-footer-animation-project") and re-branded for
 * YICDVP. Three layers over one 1304x720 stage (container-query units
 * keep every element proportional to the stage width):
 *
 *   L1  plate image (bridge and mountain pagoda over the river) with a
 *       top-down mist reveal - re-run whenever `animKey` bumps;
 *   L2  the 60fps scene video in "hybrid" mode (default, labelled
 *       60fps Synced + DOM) - `preload="none"` + poster, so decoding and
 *       playback start only once the footer is armed by the viewport
 *       observer (the assets themselves live as real files in
 *       /public/assets, extracted from the reference's inline base64);
 *   L3  real interactive DOM typography - our logos, brand line,
 *       description, copyright, nav columns (react-router Links) and
 *       socials - wiped in left-to-right at the reference's coordinates.
 *
 * Once the video ends (or in layered mode) woodblock birds keep crossing
 * and boats glide the river - pure CSS keyframes from index.css.
 * The whisper-quiet controller bar (hover out) replays the reveal,
 * pauses the scene, cycles speed and switches render mode.
 *
 * Reduced motion: video autoplay is skipped and the global clamp parks
 * the loops at their rest frames; the mist and wipes land instantly on
 * their final states via the RM overrides in index.css.
 */

const FOOTER_REDUCED =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
   ambient flight after the video ends or in CSS/SVG Layered mode. */
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
        <path d="M4 18C10 9 17 7 23 15C28 7 36 5 44 12C37 13 31 16 26 21C19 22 12 20 4 18Z" fill="#4A35D7" />
        <path d="M14 17C18 14 23 15 27 18C23 19 18 19 14 17Z" fill="#FAFBEF" />
      </g>
    )}
    {variant === 2 && (
      <g>
        <path d="M3 14C11 6 19 8 24 16C29 9 37 7 45 14C37 15 30 18 25 22C18 21 10 18 3 14Z" fill="#3B28B8" />
        <path d="M16 16C20 14 24 15 28 18C23 19 19 18 16 16Z" fill="#FAFBEF" />
      </g>
    )}
    {variant === 3 && (
      <path d="M6 16C13 11 19 12 24 17C29 12 35 11 42 16C35 15 29 17 24 20C19 17 13 15 6 16Z" fill="#261765" />
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

const Footer = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [animKey, setAnimKey] = useState(0);
  const [armed, setArmed] = useState(false);
  const [renderMode, setRenderMode] = useState<"hybrid" | "layered">("hybrid");
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // A missing/undecodable video silently degrades to the layered scene.
  const effectiveMode = videoFailed ? "layered" : renderMode;
  const hybridLive = effectiveMode === "hybrid";

  const triggerReplay = useCallback(() => {
    // Re-key every layer: the mist plate and wipes restart via key bump,
    // and the video effect below replays the fresh element. Directly
    // poking videoRef here would race the remount.
    setVideoEnded(false);
    setAnimKey((prev) => prev + 1);
  }, []);

  // Playback is started only when the footer is armed (in the viewport):
  // preload="none" keeps the 1.3MB scene off the wire until then.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = playbackSpeed;
    if (!armed || !hybridLive || FOOTER_REDUCED) return;
    vid
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setVideoFailed(true));
  }, [animKey, renderMode, playbackSpeed, videoFailed, armed, hybridLive]);

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

  const togglePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setVideoFailed(true));
    } else {
      vid.pause();
    }
  };

  const cycleSpeed = () => {
    const next = playbackSpeed === 1 ? 0.5 : playbackSpeed === 0.5 ? 0.25 : 1;
    setPlaybackSpeed(next);
    if (videoRef.current) {
      videoRef.current.playbackRate = next;
    }
  };

  return (
    <footer
      ref={containerRef}
      data-armed={armed ? "true" : "false"}
      aria-label="YICDVP animated footer"
      className="group relative w-full select-none overflow-hidden"
    >
      {/* 1304 x 720 stage with container-query units (cqw scales type,
          icons and boat sizes with the stage width, like the reference). */}
      <div
        className="relative mx-auto w-full overflow-hidden bg-[#FAFBEF]"
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
            className="h-full w-full object-cover object-center"
            draggable={false}
          />
        </div>

        {/* Ambient woodblock birds: layered mode, or after the 60fps scene
            video finishes. The wings flap while the flock drifts across. */}
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
                animation: `hashiFlockAcross ${11 / playbackSpeed}s linear infinite`,
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

        {/* Layered-only extras: the river boats from the actual 60fps scene. */}
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
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setVideoEnded(true);
              setIsPlaying(false);
            }}
            onError={() => {
              setVideoFailed(true);
              setIsPlaying(false);
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            style={{ zIndex: 3 }}
          />
        )}

        {/* LAYER 3: real interactive DOM typography at the reference's
            measured coordinates. Hidden on <md, where the stacked block
            below takes over for readability. */}
        <div key={`dom-${animKey}`} className="absolute inset-0 hidden h-full w-full md:block" style={{ zIndex: 10 }}>
          {/* Top-left logos + brand (left 3.067%, top 9.444%) */}
          <div
            className="animate-wipe-logo absolute flex items-center"
            style={{ left: "3.067%", top: "9.444%", height: "5.556%" }}
          >
            <Link
              to="/"
              aria-label="YICDVP home"
              className="flex h-full items-center focus-visible:outline focus-visible:outline-[#4A35D7]"
            >
              <div className="flex h-full items-center" style={{ gap: "0.6cqw" }}>
                <OptimizedImage src={clubLogo} alt="Young Innovators Club logo" className="h-full w-auto" />
                <OptimizedImage src={schoolLogo} alt="Dharmapala Vidyalaya logo" className="h-full w-auto" />
              </div>
              <span className="flex flex-col" style={{ marginLeft: "0.75cqw" }}>
                <span
                  className="font-display font-black lowercase leading-none tracking-tighter"
                  style={{ fontSize: "1.8cqw", color: "#261765" }}
                >
                  yicdvp
                </span>
                <span
                  className="uppercase"
                  style={{
                    marginTop: "0.25cqw",
                    fontSize: "0.72cqw",
                    letterSpacing: "0.18em",
                    fontWeight: 700,
                    color: "#8E9086",
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
              fontSize: "0.945cqw",
              lineHeight: 1.33,
              color: "#8E9086",
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
              fontSize: "0.94cqw",
              lineHeight: 1.2,
              color: "#3A306A",
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
                className="text-[#261765]/70 transition-colors hover:text-[#4A35D7] focus-visible:text-[#4A35D7] focus-visible:outline focus-visible:outline-[#4A35D7]"
              >
                <social.icon style={{ width: "1.4cqw", height: "1.4cqw" }} />
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
              style={{ fontSize: "0.86cqw", lineHeight: 1, color: "#93948B", marginBottom: "1.35cqw" }}
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
              style={{ fontSize: "0.86cqw", lineHeight: 1, color: "#93948B", marginBottom: "1.35cqw" }}
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

        {/* Whisper-quiet controller bar (revealed on hover / focus). */}
        <div className="absolute top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#4A35D7]/20 bg-[#FAFBEF]/92 px-3 py-1.5 opacity-0 shadow-sm backdrop-blur-md transition-all duration-300 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => triggerReplay()}
            title="Replay the footer reveal animation"
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#261765] transition-colors hover:bg-[#4A35D7]/10"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#4A35D7]" />
            <span>Replay Reveal</span>
          </button>

          <div className="h-3.5 w-px bg-[#261765]/15" />

          <button
            type="button"
            onClick={togglePlayPause}
            title={isPlaying ? "Pause scene" : "Play scene"}
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[#261765] transition-colors hover:bg-[#4A35D7]/10"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 text-[#4A35D7]" /> : <Play className="h-3.5 w-3.5 text-[#4A35D7]" />}
          </button>

          <button
            type="button"
            onClick={cycleSpeed}
            title="Cycle animation speed"
            className="cursor-pointer rounded-full px-2 py-1 font-mono text-xs text-[#261765] transition-colors hover:bg-[#4A35D7]/10"
          >
            {playbackSpeed}x
          </button>

          <div className="h-3.5 w-px bg-[#261765]/15" />

          <button
            type="button"
            onClick={() => setRenderMode((mode) => (mode === "hybrid" ? "layered" : "hybrid"))}
            title="Switch render mode"
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-[#261765] transition-colors hover:bg-[#4A35D7]/10"
          >
            {hybridLive ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-[#4A35D7]" />
                <span>60fps Synced + DOM</span>
              </>
            ) : (
              <>
                <Layers className="h-3.5 w-3.5 text-[#4A35D7]" />
                <span>CSS/SVG Layered</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: the stage's DOM overlay only scales down to <md widths, so
          small screens get a readable stacked version of the same content. */}
      <div className="bg-[#FAFBEF] px-5 py-8 text-[#261765] md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <OptimizedImage src={clubLogo} alt="Young Innovators Club logo" className="h-10 w-auto" />
            <OptimizedImage src={schoolLogo} alt="Dharmapala Vidyalaya logo" className="h-10 w-auto" />
          </div>
          <div>
            <p className="font-display text-2xl font-black lowercase leading-none tracking-tighter">yicdvp</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E9086]">
              young innovators club
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#8E9086]">
          A young innovators club at Dharmapala Vidyalaya, Pannipitiya. We build and celebrate student tech:
          workshops, hackathons, projects and shared wins.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <nav aria-label="Footer navigation">
            <p className="text-xs text-[#93948B]">Menu</p>
            <ul className="mt-2 space-y-2">
              {MENU_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[15px] font-medium text-[#2E2266] hover:text-[#4A35D7]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Footer explore links">
            <p className="text-xs text-[#93948B]">Explore</p>
            <ul className="mt-2 space-y-2">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[15px] font-medium text-[#2E2266] hover:text-[#4A35D7]">
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
              className="text-[#261765]/70 transition-colors hover:text-[#4A35D7]"
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        <p className="mt-5 text-xs text-[#3A306A]">yicdvp © 2026, crafted to spark</p>
      </div>
    </footer>
  );
};

export default Footer;
