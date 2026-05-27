import { useRef, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Play, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { useInViewport } from "@/hooks/useInViewport";
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  getVimeoEmbedUrl,
  getInstagramEmbedUrl,
  detectMediaSource,
  resolveThumb as _resolveThumb,
  type MediaSource,
} from "@/lib/mediaUtils";

// Re-export URL helpers for backward compatibility (CustomVideoPlayer, etc.)
export {
  extractYouTubeId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  getVimeoEmbedUrl,
  getInstagramEmbedUrl,
  detectMediaSource,
  type MediaSource,
};

const CustomVideoPlayer = lazy(() => import("./CustomVideoPlayer"));

// ─── MediaTile ──────────────────────────────────────────────────────────────

export interface MediaTileItem {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  media_type?: string | null;
  video_autoplay?: boolean | null;
  video_is_muted?: boolean | null;
  video_loop?: boolean | null;
  video_controls?: boolean | null;
  base64_placeholder?: string | null;
}

interface MediaTileProps {
  item: MediaTileItem;
  /** Render full embed inline (for lightbox). Default: thumbnail only. */
  inline?: boolean;
  /** Preview video on hover (desktop). Default: true. */
  hoverPreview?: boolean;
  /** Mark this tile high-priority (above-fold). */
  priority?: boolean;
  className?: string;
  /** Inline only: respect autoplay/loop settings from item. */
  autoplaySettings?: boolean;
}

export function resolveThumb(item: MediaTileItem): string {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.image_url) return item.image_url;
  if (item.video_url) return getYouTubeThumbnail(item.video_url) ?? "";
  return "";
}

const MediaTile = ({
  item,
  inline = false,
  hoverPreview = true,
  priority = false,
  className,
  autoplaySettings = false,
}: MediaTileProps) => {
  const source = detectMediaSource(item.media_type, item.video_url);
  const thumb = resolveThumb(item);
  const { ref, inView } = useInViewport<HTMLDivElement>({ rootMargin: "300px", once: !inline });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);

  // Hover preview for direct videos only
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovering) v.play().catch(() => {});
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hovering]);

  const handleEnter = useCallback(() => hoverPreview && setHovering(true), [hoverPreview]);
  const handleLeave = useCallback(() => setHovering(false), []);

  // Inline mode (lightbox) — render the actual playable embed.
  if (inline) {
    if (!inView) {
      return (
        <div ref={ref} className={cn("w-full aspect-video bg-muted/20 animate-pulse rounded-3xl", className)} />
      );
    }
    if ((source === "youtube" || source === "vimeo" || source === "instagram" || source === "direct-video") && item.video_url) {
      return (
        <div ref={ref} className={cn("w-full", source === "instagram" ? "" : "aspect-video", className)}>
          <Suspense fallback={<div className="w-full aspect-video bg-muted/20 animate-pulse rounded-3xl" />}>
            <CustomVideoPlayer
              url={item.video_url}
              mediaType={item.media_type}
              poster={thumb}
              title={item.title}
              autoplay={autoplaySettings ? !!item.video_autoplay : true}
              muted={autoplaySettings ? !!item.video_is_muted : false}
              loop={autoplaySettings ? !!item.video_loop : false}
              controls={autoplaySettings ? item.video_controls !== false : true}
            />
          </Suspense>
        </div>
      );
    }
    // Image fallback
    return (
      <OptimizedImage
        src={item.image_url || thumb}
        alt={item.title}
        priority={priority}
        dynamicPlaceholder={item.base64_placeholder || undefined}
        className={cn("max-w-full max-h-[85vh] object-contain rounded-3xl border border-white/10", className)}
      />
    );
  }

  // Thumbnail mode (grid)
  return (
    <div
      ref={ref}
      className={cn("relative w-full h-full overflow-hidden", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {inView ? (
        <>
          {thumb ? (
            <OptimizedImage
              src={thumb}
              alt={item.title}
              priority={priority}
              dynamicPlaceholder={item.base64_placeholder || undefined}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              source === "instagram" ? "bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-orange-400/20" : "bg-muted/30"
            )}>
              {source === "instagram" ? <Instagram className="w-12 h-12 text-pink-400/50" /> : <Play className="w-12 h-12 text-muted-foreground/30" />}
            </div>
          )}

          {/* Hover preview for direct videos */}
          {hoverPreview && source === "direct-video" && item.video_url && (
            <video
              ref={videoRef}
              src={item.video_url}
              muted
              loop
              playsInline
              preload="none"
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                hovering ? "opacity-100" : "opacity-0"
              )}
            />
          )}

          {/* Type indicator */}
          {(source === "youtube" || source === "vimeo" || source === "direct-video") && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-background/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-foreground shadow-2xl group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          )}
          {source === "instagram" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/80 to-purple-600/80 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20 group-hover:scale-110 transition-all duration-300">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-muted/20 animate-pulse" />
      )}
    </div>
  );
};

export default MediaTile;
