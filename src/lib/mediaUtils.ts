/**
 * Consolidated media URL utilities — single source of truth.
 *
 * Previously duplicated across GalleryManager, Gallery, MediaTile,
 * and CustomVideoPlayer.  All four now import from here.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VideoSettings {
  autoplay?: boolean;
  mute?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export type VideoSource = "youtube" | "vimeo" | "instagram" | "direct" | null;
export type MediaSource = "image" | "youtube" | "vimeo" | "instagram" | "direct-video";

export const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  youtube: { label: "YouTube", color: "bg-red-500/80" },
  vimeo: { label: "Vimeo", color: "bg-blue-500/80" },
  instagram: { label: "Instagram", color: "bg-pink-500/80" },
  direct: { label: "Direct", color: "bg-green-500/80" },
};

// ─── YouTube ────────────────────────────────────────────────────────────────

/** Extract a YouTube video ID from any common URL format */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([^&?/#\s]{11})/
  );
  return match?.[1] ?? null;
}

/** Return the best-quality thumbnail URL for a YouTube video */
export function getYouTubeThumbnail(
  url: string,
  quality: "hq" | "max" = "hq"
): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality === "max" ? "maxresdefault" : "hqdefault"}.jpg`;
}

/** Build a privacy-enhanced YouTube embed URL */
export function getYouTubeEmbedUrl(url: string, settings?: VideoSettings): string {
  const id = extractYouTubeId(url);
  if (!id) return url;
  // Browsers block unmuted autoplay — force mute when autoplay is on
  const effectiveMute = settings?.autoplay ? true : (settings?.mute ?? false);
  const params = new URLSearchParams({
    autoplay: settings?.autoplay ? "1" : "0",
    mute: effectiveMute ? "1" : "0",
    controls: settings?.controls === false ? "0" : "1",
    loop: settings?.loop ? "1" : "0",
    playlist: settings?.loop ? id : "",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/** Fetch YouTube metadata (title, description, thumbnail) via noembed */
export async function fetchYouTubeMetadata(
  url: string
): Promise<{ title?: string; description?: string; thumbnail?: string } | null> {
  try {
    const resp = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      title: data.title || undefined,
      description: data.author_name ? `Video by ${data.author_name}` : undefined,
      thumbnail: data.thumbnail_url || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Vimeo ──────────────────────────────────────────────────────────────────

/** Build a Vimeo embed URL */
export function getVimeoEmbedUrl(
  url: string,
  settings?: VideoSettings
): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  if (!match) return url;
  const params = new URLSearchParams({
    autoplay: settings?.autoplay ? "1" : "0",
    muted: settings?.mute ? "1" : "0",
    loop: settings?.loop ? "1" : "0",
    dnt: "1",
  });
  return `https://player.vimeo.com/video/${match[1]}?${params.toString()}`;
}

/** Extract a Vimeo video ID */
export function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

// ─── Instagram ──────────────────────────────────────────────────────────────

export const IG_TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  tv: "IGTV",
  p: "Post",
};

/** Extract an Instagram embed URL from a post/reel/tv URL */
export function getInstagramEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

/** Parse structured info from an Instagram URL */
export function parseInstagramUrl(url: string): {
  type: "post" | "reel" | "tv";
  shortcode: string;
  username?: string;
} | null {
  if (!url) return null;
  const match = url.match(
    /instagram\.com\/(?:([A-Za-z0-9._]+)\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/
  );
  if (!match) return null;
  return {
    username: match[1] && !["www", ""].includes(match[1]) ? match[1] : undefined,
    type: match[2] as "post" | "reel" | "tv",
    shortcode: match[3],
  };
}

// ─── Source Detection ───────────────────────────────────────────────────────

export function detectVideoSource(url: string): VideoSource {
  if (!url) return null;
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("instagram.com")) return "instagram";
  return "direct";
}

export function detectMediaSource(
  mediaType?: string | null,
  url?: string | null
): MediaSource {
  if (mediaType === "instagram") return "instagram";
  if (mediaType === "video" && url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("vimeo.com")) return "vimeo";
    if (url.includes("instagram.com")) return "instagram";
    return "direct-video";
  }
  return "image";
}

// ─── Thumbnail Resolution ───────────────────────────────────────────────────

export interface MediaItem {
  thumbnail_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
}

/** Resolve the best available thumbnail for any media item */
export function resolveThumb(item: MediaItem): string {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.image_url) return item.image_url;
  if (item.video_url) return getYouTubeThumbnail(item.video_url) ?? "";
  return "";
}
