// react-doctor-disable no-giant-component
import { useEffect, useRef, useState, useCallback, useId } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Settings,
  Loader2,
  Instagram,
  PictureInPicture2,
  SkipForward,
  SkipBack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LiquidGlassProvider from "@/components/effects/VideoLiquidGlassProvider";
import {
  detectMediaSource,
  extractYouTubeId,
  extractVimeoId,
  getInstagramEmbedUrl,
} from "@/lib/mediaUtils";
import { useTheme } from "next-themes";

export interface CustomVideoPlayerProps {
  url: string;
  mediaType?: string | null;
  poster?: string | null;
  title?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  accent?: string;
}

/**
 * Helper to format time in seconds to mm:ss format.
 */
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

/**
 * Unified custom video player with branded WebGL liquid glass UI for YouTube, Vimeo, Instagram and direct video sources.
 * Features Ambilight backglow, animated timeline with hover-seek preview, volume slider, keyboard shortcuts, and PiP.
 */
const CustomVideoPlayer = ({
  url,
  mediaType,
  poster,
  title,
  autoplay = false,
  muted = true,
  loop = false,
  controls = true,
  className,
  accent = "#7c5cff",
}: CustomVideoPlayerProps) => {
  const source = detectMediaSource(mediaType, url);
  const isDirect = source === "direct-video";

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ambiCanvasRef = useRef<HTMLCanvasElement>(null);
  const ambiRaf = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const playerId = useId().replace(/:/g, "");
  const { theme } = useTheme();

  const glassConfig = theme === "light"
    ? { brightness: -0.3, blurAmount: 0.25, cornerRadius: 50 }
    : { blurAmount: 0.25, cornerRadius: 30 };
    
  const buttonGlassConfig = JSON.stringify({ button: true, cornerRadius: 24 });

  // react-doctor-disable no-derived-useState
  // react-doctor-disable rerender-state-only-in-handlers
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [ripple, setRipple] = useState<number | null>(null);
  const [canPiP, setCanPiP] = useState(false);

  // ────── Auto-hide controls ──────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (isPlaying && !showSpeedMenu) {
      hideTimer.current = window.setTimeout(() => setShowControls(false), 2800);
    }
  }, [isPlaying, showSpeedMenu]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  // ────── Fullscreen ──────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current.requestFullscreen?.();
    }
  }, []);

  // ────── PiP availability ──────
  useEffect(() => {
    setCanPiP(
      isDirect &&
        typeof document !== "undefined" &&
        !!document.pictureInPictureEnabled
    );
  }, [isDirect]);

  // ────────────── AMBILIGHT (samples direct video frames) ──────────────
  useEffect(() => {
    if (!isDirect || !controls) return;
    const video = videoRef.current;
    const canvas = ambiCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let stopped = false;
    const draw = () => {
      if (stopped) return;
      try {
        if (!video.paused && !video.ended && video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      } catch {
        /* cross-origin frame — silently skip */
      }
      ambiRaf.current = window.requestAnimationFrame(draw);
    };
    ambiRaf.current = window.requestAnimationFrame(draw);
    return () => {
      stopped = true;
      if (ambiRaf.current) window.cancelAnimationFrame(ambiRaf.current);
    };
  }, [isDirect, url]);

  // ────────────── direct video handlers ──────────────
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration || 1;
    setProgress((v.currentTime / d) * 100);
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / d) * 100);
    }
  };

  const onLoadedMeta = () => {
    setDuration(videoRef.current?.duration ?? 0);
    setLoading(false);
  };

  const triggerRipple = useCallback(() => {
    setRipple(Date.now());
    window.setTimeout(() => setRipple(null), 600);
  }, []);

  // ─────────────────── YOUTUBE / VIMEO via postMessage ───────────────────
  const ytId = source === "youtube" ? extractYouTubeId(url) : null;
  const vimeoId = source === "vimeo" ? extractVimeoId(url) : null;

  const effectiveMute = autoplay ? true : muted;
  const ytEmbed = ytId
    ? `https://www.youtube.com/embed/${ytId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&fs=0&autoplay=${autoplay ? 1 : 0}&mute=${effectiveMute ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${loop ? ytId : ""}`
    : null;

  const vimeoEmbed = vimeoId
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=0&dnt=1&title=0&byline=0&portrait=0`
    : null;

  const ytPost = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  }, []);

  const vimeoPost = useCallback((method: string, value?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify(value === undefined ? { method } : { method, value }),
      "*"
    );
  }, []);

  useEffect(() => {
    if (source !== "youtube" && source !== "vimeo") return;

    const handler = (e: MessageEvent) => {
      if (!e.data) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (source === "youtube" && data.event === "onStateChange") {
          // 1=playing, 2=paused
          if (data.info === 1) setIsPlaying(true);
          if (data.info === 2 || data.info === 0) setIsPlaying(false);
        }
        if (source === "vimeo") {
          if (data.event === "play") setIsPlaying(true);
          if (data.event === "pause" || data.event === "ended") setIsPlaying(false);
          if (data.event === "timeupdate" && data.data) {
            setProgress((data.data.percent ?? 0) * 100);
            setDuration(data.data.duration ?? 0);
            setCurrentTime(data.data.seconds ?? 0);
          }
          if (data.event === "ready") {
            setLoading(false);
            vimeoPost("addEventListener", "play");
            vimeoPost("addEventListener", "pause");
            vimeoPost("addEventListener", "ended");
            vimeoPost("addEventListener", "timeupdate");
          }
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [source, vimeoPost]);

  const togglePlay = useCallback(() => {
    triggerRipple();
    if (source === "youtube") {
      ytPost(isPlaying ? "pauseVideo" : "playVideo");
      setIsPlaying((p) => !p);
    } else if (source === "vimeo") {
      vimeoPost(isPlaying ? "pause" : "play");
      setIsPlaying((p) => !p);
    } else {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play();
        setIsPlaying(true);
      } else {
        v.pause();
        setIsPlaying(false);
      }
    }
  }, [source, isPlaying, ytPost, vimeoPost, triggerRipple]);

  const toggleMute = useCallback(() => {
    if (source === "youtube") {
      ytPost(isMuted ? "unMute" : "mute");
      setIsMuted((m) => !m);
    } else if (source === "vimeo") {
      vimeoPost("setMuted", !isMuted);
      setIsMuted((m) => !m);
    } else {
      const v = videoRef.current;
      if (!v) return;
      v.muted = !v.muted;
      setIsMuted(v.muted);
      setVolume(v.muted ? 0 : v.volume || 1);
    }
  }, [source, isMuted, ytPost, vimeoPost]);

  const handleVolume = useCallback(
    (val: number) => {
      const v = videoRef.current;
      setVolume(val);
      if (source === "youtube") ytPost("setVolume", [val * 100]);
      else if (source === "vimeo") vimeoPost("setVolume", val);
      else if (v) {
        v.volume = val;
        v.muted = val === 0;
      }
      setIsMuted(val === 0);
    },
    [source, ytPost, vimeoPost]
  );

  const seekToPct = useCallback(
    (pct: number) => {
      const clamped = Math.min(100, Math.max(0, pct));
      if (source === "vimeo") {
        vimeoPost("setCurrentTime", (clamped / 100) * (duration || 0));
      } else if (isDirect && videoRef.current) {
        videoRef.current.currentTime =
          (clamped / 100) * (videoRef.current.duration || 0);
      }
      setProgress(clamped);
    },
    [source, isDirect, duration, vimeoPost]
  );

  const skip = useCallback(
    (sec: number) => {
      if (isDirect && videoRef.current) {
        videoRef.current.currentTime = Math.max(
          0,
          Math.min(
            videoRef.current.duration || 0,
            videoRef.current.currentTime + sec
          )
        );
      } else if (source === "vimeo") {
        const t = (progress / 100) * (duration || 0) + sec;
        vimeoPost("setCurrentTime", Math.max(0, t));
      }
    },
    [isDirect, source, progress, duration, vimeoPost]
  );

  const handleSpeed = useCallback((rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setSpeed(rate);
    setShowSpeedMenu(false);
  }, []);

  const handleRestart = useCallback(() => {
    if (isDirect && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      seekToPct(0);
    }
  }, [isDirect, seekToPct]);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {
      /* ignore */
    }
  }, []);

  // ────────────── keyboard shortcuts ──────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" && e.key !== "Escape") {
        return;
      }
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-5);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolume(Math.max(0, volume - 0.1));
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        default:
          break;
      }
      resetHideTimer();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [
    togglePlay,
    skip,
    handleVolume,
    volume,
    toggleMute,
    toggleFullscreen,
    resetHideTimer,
  ]);

  const onProgressMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setHoverPct(Math.min(100, Math.max(0, pct)));
  }, []);

  const VolumeIcon = volume === 0 || isMuted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showTimeline = isDirect || source === "vimeo";
  const accentSoft = `${accent}cc`;

  // Helper button inside controls
  const GlassBtn = ({
    onClick,
    label,
    className: btnClassName,
    children,
  }: {
    onClick: () => void;
    label: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "size-9 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        btnClassName
      )}
      data-liquid-glass
      data-config={buttonGlassConfig}
    >
      {children}
    </button>
  );

  // ─────────────────── INSTAGRAM ───────────────────
  if (source === "instagram") {
    const embed = getInstagramEmbedUrl(url);
    if (!embed) return null;
    return (
      <div
        className={cn(
          "relative w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-gray-950 border border-white/10 shadow-2xl",
          className
        )}
        style={{ minHeight: 560 }}
      >
        <iframe
          src={embed}
          className="w-full border-0"
          style={{ height: 620 }}
          allowFullScreen
          allow="encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-popups allow-same-origin"
          title={title || "Instagram post"}
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500/90 to-purple-600/90 backdrop-blur-md text-white text-xs font-medium pointer-events-none">
          <Instagram className="size-3" /> Instagram
        </div>
      </div>
    );
  }

  // ─────────────────── RENDER (YT / Vimeo / Direct) ───────────────────
  return (
    <div className={cn("relative w-full", className)}>
      {/* AMBILIGHT GLOW (behind player) */}
      {controls && (
        <div
          className="pointer-events-none absolute -inset-8 -z-10 transition-opacity duration-700"
          style={{ opacity: isPlaying ? 1 : 0.55 }}
          aria-hidden="true"
        >
          {isDirect ? (
            <canvas
              ref={ambiCanvasRef}
              width={32}
              height={18}
              className="w-full h-full rounded-[48px]"
              style={{
                filter: "blur(72px) saturate(1.7) brightness(1.05)",
                transform: "scale(1.15)",
                opacity: 0.9,
              }}
            />
          ) : (
            <div
              className="w-full h-full rounded-[48px] animate-ambi"
              style={{
                background: `radial-gradient(60% 60% at 30% 30%, ${accent}, transparent 70%), radial-gradient(60% 60% at 70% 70%, ${accentSoft}, transparent 70%)`,
                filter: "blur(80px) saturate(1.6)",
              }}
            />
          )}
        </div>
      )}

      {/* PLAYER SURFACE */}
      <div
        ref={containerRef}
        tabIndex={0}
        className={cn(
          "relative group/player w-full rounded-3xl overflow-hidden bg-background/25 backdrop-blur-xl border border-white/20 shadow-2xl before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-primary/10 before:to-secondary/10 outline-none ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-white/40",
          controls ? "aspect-video" : "size-full"
        )}
        onMouseMove={resetHideTimer}
        onMouseLeave={() => isPlaying && !showSpeedMenu && setShowControls(false)}
        onClick={(e) => {
          // click on backdrop toggles play
          if (e.target === e.currentTarget) togglePlay();
        }}
        aria-label={title || "Video player"}
      >
        {/* glass edge highlight */}
        <div
          className="pointer-events-none absolute inset-0 z-30 rounded-3xl"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 60px rgba(255,255,255,0.04)",
          }}
        />

        {/* Media surface */}
        {source === "youtube" && ytEmbed && (
          <iframe
            ref={iframeRef}
            id={`yt-${playerId}`}
            src={ytEmbed}
            className="absolute inset-0 size-full border-0 pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            sandbox="allow-scripts allow-popups allow-presentation allow-same-origin"
            title={title || "YouTube video"}
            onLoad={() => {
              setLoading(false);
              // Subscribe to events via postMessage
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: playerId }),
                "*"
              );
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
                "*"
              );
            }}
          />
        )}
        {source === "vimeo" && vimeoEmbed && (
          <iframe
            ref={iframeRef}
            src={vimeoEmbed}
            className="absolute inset-0 size-full border-0 pointer-events-none"
            allow="autoplay; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-popups allow-presentation allow-same-origin"
            title={title || "Vimeo video"}
          />
        )}
        {isDirect && (
          <video
            ref={videoRef}
            src={url}
            poster={poster || undefined}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            crossOrigin="anonymous"
            playsInline
            preload="metadata"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMeta}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setLoading(true)}
            onCanPlay={() => setLoading(false)}
            onClick={togglePlay}
            className={cn("absolute inset-0 size-full bg-gray-950", controls ? "object-contain" : "object-cover")}
            aria-label={title || "Video"}
          />
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl animate-pulse"
                style={{ background: accent, opacity: 0.5 }}
              />
              <Loader2 className="relative size-12 text-white animate-spin" />
            </div>
          </div>
        )}

        {/* Big play overlay when paused */}
        {controls && !isPlaying && !loading && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10"
            aria-label="Play video"
          >
            <LiquidGlassProvider config={glassConfig}>
              {/* Colorful graphic sibling to be captured and refracted by WebGL */}
              <span className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-accent/30 rounded-[24px] blur-sm pointer-events-none" />
              <span
                data-liquid-glass
                data-config={buttonGlassConfig}
                className="relative size-20 rounded-[24px] bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl group-hover/player:scale-110 transition-transform"
              >
                <Play className="size-9 text-white fill-white ml-1" />
              </span>
            </LiquidGlassProvider>
          </button>
        )}

        {/* CLICK RIPPLE */}
        {ripple && (
          <span
            key={ripple}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ripple"
            style={{ background: "rgba(255,255,255,0.25)" }}
          />
        )}

        {/* CONTROLS */}
        {controls && (
          <LiquidGlassProvider config={glassConfig}>
            {/* Shadow gradient background sibling captured and refracted by WebGL */}
            <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
            <div
              data-liquid-glass
              className={cn(
                "absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4 pt-12 pb-3 bg-white/5 backdrop-blur-[2px] transition-all duration-300 border-t border-white/10",
                showControls || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* TIMELINE */}
              {showTimeline && (
                <div
                  ref={progressBarRef}
                  className="group/bar relative w-full h-6 flex items-center cursor-pointer mb-2"
                  onMouseMove={onProgressMove}
                  onMouseLeave={() => setHoverPct(null)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seekToPct(((e.clientX - rect.left) / rect.width) * 100);
                  }}
                  role="slider"
                  aria-label="Seek"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  tabIndex={0}
                >
                  {/* track */}
                  <div className="relative w-full h-1.5 rounded-full bg-white/20 overflow-hidden transition-all group-hover/bar:h-2.5">
                    {/* buffered */}
                    <div
                      className="absolute inset-y-0 left-0 bg-white/25 rounded-full"
                      style={{ width: `${buffered}%` }}
                    />
                    {/* hover ghost */}
                    {hoverPct !== null && (
                      <div
                        className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                        style={{ width: `${hoverPct}%` }}
                      />
                    )}
                    {/* played */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full animate-pulse-ring"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${accent}, ${accentSoft})`,
                        boxShadow: `0 0 12px ${accent}`,
                      }}
                    />
                  </div>
                  {/* scrubber knob */}
                  <span
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity"
                    style={{
                      left: `${progress}%`,
                      boxShadow: `0 0 10px ${accent}`,
                    }}
                  />
                  {/* hover time tooltip */}
                  {hoverPct !== null && duration > 0 && (
                    <span
                      className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/85 text-white text-[11px] tabular-nums pointer-events-none"
                      style={{ left: `${hoverPct}%` }}
                    >
                      {formatTime((hoverPct / 100) * duration)}
                    </span>
                  )}
                </div>
              )}

              {/* BUTTON ROW */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-white">
                <GlassBtn onClick={togglePlay} label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
                </GlassBtn>

                {showTimeline && (
                  <>
                    <GlassBtn onClick={() => skip(-10)} label="Back 10 seconds" className="hidden sm:flex">
                      <SkipBack className="size-4" />
                    </GlassBtn>
                    <GlassBtn onClick={() => skip(10)} label="Forward 10 seconds" className="hidden sm:flex">
                      <SkipForward className="size-4" />
                    </GlassBtn>
                  </>
                )}

                <GlassBtn onClick={handleRestart} label="Restart" className="hidden sm:flex">
                  <RotateCcw className="size-4" />
                </GlassBtn>

                {/* Volume slider */}
                <div className="flex items-center group/vol">
                  <GlassBtn onClick={toggleMute} label={isMuted ? "Unmute" : "Mute"}>
                    <VolumeIcon className="size-5" />
                  </GlassBtn>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolume(Number(e.target.value))}
                    className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all duration-300 h-1 rounded-full appearance-none bg-white/25 cursor-pointer ml-0 group-hover/vol:ml-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    aria-label="Volume"
                  />
                </div>

                {/* Time readout */}
                {showTimeline && duration > 0 && (
                  <span className="ml-1 text-xs tabular-nums text-white/85 hidden xs:inline">
                    {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
                  </span>
                )}

                <div className="flex-1" />

                {/* speed (direct only) */}
                {isDirect && (
                  <div className="relative">
                    <GlassBtn
                      onClick={() => setShowSpeedMenu((s) => !s)}
                      label="Playback speed"
                      className="px-2.5 gap-1 text-xs font-medium w-auto"
                    >
                      <Settings className="size-4" />
                      <span className="tabular-nums">{speed}×</span>
                    </GlassBtn>
                    {showSpeedMenu && (
                      <div
                        className="absolute right-0 bottom-full mb-2 w-24 rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
                        style={{
                          background: "rgba(15,15,22,0.9)",
                          backdropFilter: "blur(14px)",
                          WebkitBackdropFilter: "blur(14px)",
                        }}
                      >
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleSpeed(r)}
                            className={cn(
                              "w-full px-3 py-1.5 text-xs text-left hover:bg-white/10 transition-colors",
                              r === speed ? "text-primary font-semibold" : "text-white/85"
                            )}
                            style={r === speed ? { color: accent } : undefined}
                          >
                            {r}×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {canPiP && (
                  <GlassBtn onClick={togglePiP} label="Picture in picture" className="hidden sm:flex">
                    <PictureInPicture2 className="size-5" />
                  </GlassBtn>
                )}

                <GlassBtn onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                  {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
                </GlassBtn>
              </div>
            </div>
          </LiquidGlassProvider>
        )}

        {/* PROVIDER BADGE */}
        {controls && (
          <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-white/80 text-[10px] uppercase tracking-wider font-semibold pointer-events-none backdrop-blur-md">
            {source === "youtube" ? "YouTube" : source === "vimeo" ? "Vimeo" : "Video"}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ambiShift {
          0% { transform: scale(1.1) rotate(0deg); }
          50% { transform: scale(1.25) rotate(8deg); }
          100% { transform: scale(1.1) rotate(0deg); }
        }
        .animate-ambi { animation: ambiShift 12s ease-in-out infinite; }
        @keyframes pulseRing {
          0% { transform: scale(0.85); opacity: 0.45; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .animate-pulse-ring { animation: pulseRing 2.2s ease-out infinite; }
        @keyframes rippleAnim {
          0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
        .animate-ripple { animation: rippleAnim 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CustomVideoPlayer;
