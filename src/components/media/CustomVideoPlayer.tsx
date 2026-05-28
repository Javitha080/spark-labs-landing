// react-doctor-disable no-giant-component
import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Settings, Loader2, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import LiquidGlassProvider from "@/components/effects/LiquidGlassProvider";
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
}

/**
 * Unified custom video player with branded UI for YouTube, Vimeo, Instagram and direct video sources.
 * - Hides provider chrome where possible (YouTube/Vimeo via JS API).
 * - Provides play/pause, mute toggle, seek, fullscreen, restart, playback speed.
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
}: CustomVideoPlayerProps) => {
  const source = detectMediaSource(mediaType, url);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
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
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const hideTimer = useRef<number | null>(null);

  // ────── Auto-hide controls ──────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (isPlaying) {
      hideTimer.current = window.setTimeout(() => setShowControls(false), 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetHideTimer]);

  // ────── Fullscreen ──────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen?.();
  };

  // ─────────────────── DIRECT VIDEO ───────────────────
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setProgress((v.currentTime / (v.duration || 1)) * 100);
  };
  const onLoadedMeta = () => {
    setDuration(videoRef.current?.duration ?? 0);
    setLoading(false);
  };
  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };
  const handleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const pct = Number(e.target.value);
    v.currentTime = (pct / 100) * (v.duration || 0);
    setProgress(pct);
  };
  const handleSpeed = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setSpeed(rate);
    setShowSpeedMenu(false);
  };
  const handleRestart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setIsPlaying(true);
  };

  // ─────────────────── YOUTUBE / VIMEO via postMessage ───────────────────
  const ytId = source === "youtube" ? extractYouTubeId(url) : null;
  const vimeoId = source === "vimeo" ? extractVimeoId(url) : null;

  // NOTE: Do NOT include &origin= — it causes CORS issues with youtube-nocookie.com
  // Also: browsers block unmuted autoplay, so force mute=1 when autoplay is on
  const effectiveMute = autoplay ? true : muted;
  // Use standard youtube.com instead of nocookie to avoid "video unavailable" errors on restricted embeds.
  const ytEmbed = ytId
    ? `https://www.youtube.com/embed/${ytId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&fs=0&autoplay=${autoplay ? 1 : 0}&mute=${effectiveMute ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${loop ? ytId : ""}`
    : null;

  const vimeoEmbed = vimeoId
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=0&dnt=1&title=0&byline=0&portrait=0`
    : null;

  // YouTube postMessage helper
  const ytPost = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  }, []);

  // Vimeo postMessage helper
  const vimeoPost = useCallback((method: string, value?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify(value === undefined ? { method } : { method, value }),
      "*"
    );
  }, []);

  // react-doctor-disable no-cascading-set-state
  // Listen for player events
  // react-doctor-disable prefer-use-effect-event
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

  const togglePlayProvider = () => {
    if (source === "youtube") {
      ytPost(isPlaying ? "pauseVideo" : "playVideo");
      setIsPlaying((p) => !p);
    } else if (source === "vimeo") {
      vimeoPost(isPlaying ? "pause" : "play");
      setIsPlaying((p) => !p);
    } else {
      handlePlayPause();
    }
  };

  const toggleMuteProvider = () => {
    if (source === "youtube") {
      ytPost(isMuted ? "unMute" : "mute");
      setIsMuted((m) => !m);
    } else if (source === "vimeo") {
      vimeoPost("setMuted", !isMuted);
      setIsMuted((m) => !m);
    } else {
      handleMute();
    }
  };

  // ─────────────────── INSTAGRAM ───────────────────
  if (source === "instagram") {
    const embed = getInstagramEmbedUrl(url);
    if (!embed) return null;
    return (
      <div className={cn("relative w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-gray-950 border border-white/10 shadow-2xl", className)} style={{ minHeight: 560 }}>
        <iframe
          src={embed}
          className="w-full border-0"
          style={{ height: 620 }}
          allowFullScreen
          allow="encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-popups"
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
    <div
      ref={containerRef}
      className={cn(
        "relative group/player w-full aspect-video rounded-3xl overflow-hidden bg-background/20 backdrop-blur-xl border border-white/20 shadow-2xl before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-primary/10 before:to-secondary/10",
        className
      )}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={(e) => {
        // click on backdrop toggles play
        if (e.target === e.currentTarget) togglePlayProvider();
      }}
    >
      {/* Media surface */}
      {source === "youtube" && ytEmbed && (
        <iframe
          ref={iframeRef}
          id={`yt-${playerId}`}
          src={ytEmbed}
          className="absolute inset-0 size-full border-0 pointer-events-none"
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-popups allow-presentation"
          title={title || "YouTube video"}
          onLoad={() => {
            setLoading(false);
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "listening", id: playerId }),
              "https://www.youtube-nocookie.com"
            );
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
              "https://www.youtube-nocookie.com"
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
          sandbox="allow-scripts allow-popups allow-presentation"
          title={title || "Vimeo video"}
        />
      )}
      {source === "direct-video" && (
        <video
          ref={videoRef}
          src={url}
          poster={poster || undefined}
          autoPlay={autoplay}
          muted={muted}
          loop={loop}
          playsInline
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMeta}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onClick={togglePlayProvider}
          className="absolute inset-0 size-full object-contain bg-gray-950"
          aria-label={title || "Video"}
        >
          <track kind="captions" src="" srcLang="en" label="English captions" />
        </video>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="size-10 text-white/80 animate-spin" />
        </div>
      )}

      {/* Big play overlay when paused */}
      {!isPlaying && !loading && (
        <button
          type="button"
          onClick={togglePlayProvider}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10"
          aria-label="Play video"
        >
          <LiquidGlassProvider config={glassConfig}>
            <span 
              data-liquid-glass 
              data-config={buttonGlassConfig}
              className="size-20 rounded-[24px] bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl group-hover/player:scale-110 transition-transform"
            >
              <Play className="size-9 text-white fill-white ml-1" />
            </span>
          </LiquidGlassProvider>
        </button>
      )}

      {/* Controls bar */}
      {controls && (
        <LiquidGlassProvider config={glassConfig}>
        <div
          data-liquid-glass
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4 pt-12 pb-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 backdrop-blur-[2px]",
            showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress (direct + vimeo) */}
          {(source === "direct-video" || source === "vimeo") && (
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={source === "direct-video" ? handleSeek : (e) => {
                const pct = Number(e.target.value);
                vimeoPost("setCurrentTime", (pct / 100) * (duration || 0));
                setProgress(pct);
              }}
              className="w-full h-1.5 mb-3 rounded-full appearance-none bg-white/20 cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
              aria-label="Seek"
            />
          )}

          <div className="flex items-center gap-2 sm:gap-3 text-white">
            <button
              type="button"
              onClick={togglePlayProvider}
              className="size-9 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
              data-liquid-glass
              data-config={buttonGlassConfig}
            >
              {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="size-9 hidden sm:flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              aria-label="Restart"
              data-liquid-glass
              data-config={buttonGlassConfig}
            >
              <RotateCcw className="size-4" />
            </button>

            <button
              type="button"
              onClick={toggleMuteProvider}
              className="size-9 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
              data-liquid-glass
              data-config={buttonGlassConfig}
            >
              {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>

            <div className="flex-1" />

            {source === "direct-video" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSpeedMenu((s) => !s)}
                  className="px-2.5 h-9 flex items-center gap-1 text-xs font-medium rounded-full hover:bg-white/15 transition-colors"
                  aria-label="Playback speed"
                  data-liquid-glass
                  data-config={buttonGlassConfig}
                >
                  <Settings className="size-4" />
                  <span className="tabular-nums">{speed}×</span>
                </button>
                {showSpeedMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-24 rounded-xl bg-black/90 backdrop-blur-md border border-white/10 overflow-hidden">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleSpeed(r)}
                        className={cn(
                          "w-full px-3 py-1.5 text-xs text-left hover:bg-white/10 transition-colors",
                          r === speed && "text-primary font-semibold"
                        )}
                      >
                        {r}×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="size-9 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              data-liquid-glass
              data-config={buttonGlassConfig}
            >
              {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>
        </LiquidGlassProvider>
      )}

      {/* Provider badge */}
      <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 text-[10px] uppercase tracking-wider font-semibold pointer-events-none">
        {source === "youtube" ? "YouTube" : source === "vimeo" ? "Vimeo" : "Video"}
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
