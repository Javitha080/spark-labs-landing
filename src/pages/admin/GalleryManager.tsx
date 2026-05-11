import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Pencil, Trash2, Plus, Image as ImageIcon, MapPin, Eye, X,
  Search, Video, Play, Volume2, VolumeX, Infinity, Settings2,
  MonitorPlay, Instagram, Youtube, ExternalLink, Link2, Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FileUpload } from "@/components/learning/FileUpload";
import { z } from "zod";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── URL Utilities ─────────────────────────────────────────────────────────────

/** Extract a YouTube video ID from any common YouTube URL format */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([^&?/#\s]{11})/
  );
  return match?.[1] ?? null;
}

/** Return the best-quality thumbnail URL for a YouTube video */
function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  // We use hqdefault as a safe fallback since maxresdefault doesn't exist for all videos
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** Build a privacy-enhanced YouTube embed URL */
function getYouTubeEmbedUrl(url: string, settings?: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean }): string {
  const id = extractYouTubeId(url);
  if (!id) return url;
  // Browsers block unmuted autoplay — force mute when autoplay is on
  const effectiveMute = settings?.autoplay ? true : (settings?.mute ?? false);
  const params = new URLSearchParams({
    autoplay: settings?.autoplay ? "1" : "0",
    mute: effectiveMute ? "1" : "0",
    controls: settings?.controls ? "1" : "0",
    loop: settings?.loop ? "1" : "0",
    playlist: settings?.loop ? id : "",
    rel: "0",
    modestbranding: "1",
    playsinline: "1"
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/** Build a Vimeo embed URL */
function getVimeoEmbedUrl(url: string, settings?: { autoplay?: boolean; mute?: boolean; loop?: boolean }): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  if (!match) return url;
  const params = new URLSearchParams({
    autoplay: settings?.autoplay ? "1" : "0",
    muted: settings?.mute ? "1" : "0",
    loop: settings?.loop ? "1" : "0"
  });
  return `https://player.vimeo.com/video/${match[1]}?${params.toString()}`;
}

/** Extract an Instagram embed URL from a post/reel/tv URL */
function getInstagramEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

type VideoSource = "youtube" | "vimeo" | "instagram" | "direct" | null;

function detectVideoSource(url: string): VideoSource {
  if (!url) return null;
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("instagram.com")) return "instagram";
  return "direct";
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  youtube: { label: "YouTube", color: "bg-red-500/80" },
  vimeo: { label: "Vimeo", color: "bg-blue-500/80" },
  instagram: { label: "Instagram", color: "bg-pink-500/80" },
  direct: { label: "Direct", color: "bg-green-500/80" },
};

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const gallerySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(1000).optional(),
  // image_url is the thumbnail — optional for Instagram (embed only)
  image_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
  media_type: z.enum(["image", "video", "instagram"]).default("image"),
  video_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
  thumbnail_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
  location_name: z.string().trim().max(200).optional(),
  location_lat: z.number().min(-90).max(90).optional().nullable(),
  location_lng: z.number().min(-180).max(180).optional().nullable(),
  display_order: z.number().int().min(0).max(999),
  video_is_muted: z.boolean().default(true),
  video_autoplay: z.boolean().default(true),
  video_loop: z.boolean().default(true),
  video_controls: z.boolean().default(true),
  collection_name: z.string().trim().max(100).optional().nullable(),
  collection_cover: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // image items must have image_url
  if (data.media_type === "image" && !data.image_url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image URL is required for image items", path: ["image_url"] });
  }
  // video items must have video_url
  if (data.media_type === "video" && !data.video_url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Video URL is required for video items", path: ["video_url"] });
  }
  // instagram items must have a valid instagram URL in video_url
  if (data.media_type === "instagram" && !data.video_url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Instagram post URL is required", path: ["video_url"] });
  }
  if (data.media_type === "instagram" && data.video_url && !getInstagramEmbedUrl(data.video_url)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Not a valid Instagram post/reel/TV URL", path: ["video_url"] });
  }
});

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  media_type: string;
  video_url: string | null;
  thumbnail_url: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  display_order: number;
  video_is_muted: boolean;
  video_autoplay: boolean;
  video_loop: boolean;
  video_controls: boolean;
  collection_name: string | null;
  collection_cover: boolean;
  created_at: string;
}

type GalleryItemInsert = Database["public"]["Tables"]["gallery_items"]["Insert"];

type MediaType = "image" | "video" | "instagram";

type FormData = {
  title: string;
  description: string;
  image_url: string;
  media_type: MediaType;
  video_url: string;
  thumbnail_url: string;
  location_name: string;
  location_lat: string;
  location_lng: string;
  display_order: number;
  video_is_muted: boolean;
  video_autoplay: boolean;
  video_loop: boolean;
  video_controls: boolean;
  collection_name: string;
  collection_cover: boolean;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Fetch YouTube metadata (title, description, thumbnail) via noembed */
async function fetchYouTubeMetadata(url: string): Promise<{ title?: string; description?: string; thumbnail?: string } | null> {
  try {
    const resp = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
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

/** Parse structured info from an Instagram URL */
function parseInstagramUrl(url: string): {
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

const IG_TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  tv: "IGTV",
  p: "Post",
};

/** Fetch Instagram post metadata via multiple providers + smart fallbacks */
async function fetchInstagramMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  postType?: string;
} | null> {
  const parsed = parseInstagramUrl(url);
  const typeLabel = parsed ? (IG_TYPE_LABELS[parsed.type] ?? "Post") : "Post";

  // ── 1. Try Instagram's official oEmbed endpoint (works for public posts) ──
  try {
    const resp = await fetch(
      `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&omitscript=true&maxwidth=480`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (resp.ok) {
      const data = await resp.json();
      // Clean HTML entities from caption text
      const rawTitle = (data.title || "") as string;
      const cleanTitle = rawTitle
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"');

      const author = data.author_name || parsed?.username || "";
      const caption = cleanTitle.length > 120
        ? cleanTitle.slice(0, 117) + "…"
        : cleanTitle;

      return {
        title: caption || (author ? `${author} – Instagram ${typeLabel}` : `Instagram ${typeLabel}`),
        description: author ? `${typeLabel} by @${author}` : undefined,
        thumbnail: data.thumbnail_url || undefined,
        author,
        postType: typeLabel,
      };
    }
  } catch {
    // oEmbed failed — continue to fallbacks
  }

  // ── 2. Try noembed as a proxy fallback ──
  try {
    const resp = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (resp.ok) {
      const data = await resp.json();
      if (!data.error) {
        const author = data.author_name || parsed?.username || "";
        return {
          title: data.title || (author ? `${author} – Instagram ${typeLabel}` : `Instagram ${typeLabel}`),
          description: author ? `${typeLabel} by @${author}` : data.title || undefined,
          thumbnail: data.thumbnail_url || undefined,
          author,
          postType: typeLabel,
        };
      }
    }
  } catch {
    // noembed also failed
  }

  // ── 3. Smart fallback from URL structure alone ──
  return {
    title: parsed?.username
      ? `${parsed.username} – Instagram ${typeLabel}`
      : `Instagram ${typeLabel}`,
    description: `Instagram ${typeLabel}${parsed?.shortcode ? ` (${parsed.shortcode})` : ""}`,
    thumbnail: undefined,
    author: parsed?.username,
    postType: typeLabel,
  };
}

/** Renders a proper embed preview for any video source, or an image */
function MediaPreview({
  mediaType,
  videoUrl,
  imageUrl,
  thumbnailUrl,
  title = "Preview",
  className = "",
  settings = { autoplay: false, mute: true, loop: false, controls: true }
}: {
  mediaType: MediaType;
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  className?: string;
  settings?: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean };
}) {
  const thumb = thumbnailUrl || imageUrl;

  if (mediaType === "instagram" && videoUrl) {
    const embedUrl = getInstagramEmbedUrl(videoUrl);
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          className={cn("border-0 w-full", className)}
          style={{ overflow: "hidden" }}
          allowFullScreen
          title={title}
        />
      );
    }
  }

  if (mediaType === "video" && videoUrl) {
    const source = detectVideoSource(videoUrl);
    if (source === "youtube") {
      return (
        <iframe
          src={getYouTubeEmbedUrl(videoUrl, settings)}
          className={cn("w-full h-full border-0", className)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      );
    }
    if (source === "vimeo") {
      return (
        <iframe
          src={getVimeoEmbedUrl(videoUrl, settings)}
          className={cn("w-full h-full border-0", className)}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
        />
      );
    }
    // direct video file
    return (
      <video
        src={videoUrl}
        poster={thumb}
        controls={settings.controls}
        autoPlay={settings.autoplay}
        muted={settings.mute}
        loop={settings.loop}
        className={cn("w-full h-full object-contain", className)}
      />
    );
  }

  if (thumb) {
    return <img src={thumb} alt={title} className={cn("w-full h-full object-cover", className)} />;
  }

  return null;
}

// ─── Main Component ────────────────────────────────────────────────────────────

const GalleryManager = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    image_url: "",
    media_type: "image",
    video_url: "",
    thumbnail_url: "",
    location_name: "",
    location_lat: "",
    location_lng: "",
    display_order: 0,
    video_is_muted: true,
    video_autoplay: true,
    video_loop: true,
    video_controls: true,
    collection_name: "",
    collection_cover: false,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      const formatted = (data ?? []).map((item: any) => ({
        ...item,
        video_is_muted: item.video_is_muted ?? true,
        video_autoplay: item.video_autoplay ?? true,
        video_loop: item.video_loop ?? true,
        video_controls: item.video_controls ?? true,
        collection_name: item.collection_name ?? "",
        collection_cover: item.collection_cover ?? false,
      }));
      setItems(formatted as GalleryItem[]);
    } catch (error) {
      toast({
        title: "Error loading gallery items",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSync(["gallery_items"], { onUpdate: fetchItems });

  // ── Auto-extract metadata from YouTube / Instagram URLs ────────────────
  const handleVideoUrlChange = useCallback(
    async (url: string) => {
      setFormData((prev) => ({ ...prev, video_url: url }));

      if (!url) return;

      const source = detectVideoSource(url);

      // ── YouTube: auto-switch to video type, extract thumbnail + metadata ──
      if (source === "youtube") {
        setFormData((prev) => ({ ...prev, media_type: "video" as MediaType }));

        const thumbUrl = getYouTubeThumbnail(url);
        if (thumbUrl) {
          setThumbnailLoading(true);
          setFormData((prev) => ({
            ...prev,
            image_url: thumbUrl,
            thumbnail_url: thumbUrl,
          }));
        }

        // Fetch title + description from noembed
        try {
          const meta = await fetchYouTubeMetadata(url);
          if (meta) {
            setFormData((prev) => ({
              ...prev,
              title: meta.title || prev.title || "",
              description: meta.description || prev.description || "",
              image_url: meta.thumbnail || thumbUrl || prev.image_url || "",
              thumbnail_url: meta.thumbnail || thumbUrl || prev.thumbnail_url || "",
            }));
            if (meta.title) {
              toast({ title: "YouTube metadata auto-filled ✓", description: meta.title });
            }
          }
        } catch {
          // Silently fail — thumbnail is already set
        } finally {
          setThumbnailLoading(false);
        }
        return;
      }

      // ── Instagram: auto-switch to instagram type, extract metadata ────────
      if (source === "instagram") {
        const embedUrl = getInstagramEmbedUrl(url);
        if (!embedUrl) {
          toast({
            title: "Invalid Instagram URL",
            description: "Use a post, reel or IGTV URL, e.g. instagram.com/p/ABC123/",
            variant: "destructive",
          });
          return;
        }

        // Parse URL immediately for instant defaults while oEmbed loads
        const parsed = parseInstagramUrl(url);
        const typeLabel = parsed ? (IG_TYPE_LABELS[parsed.type] ?? "Post") : "Post";

        setFormData((prev) => ({
          ...prev,
          media_type: "instagram" as MediaType,
          // Set a quick default title immediately (will be refined by oEmbed)
          title: prev.title || (parsed?.username
            ? `${parsed.username} – Instagram ${typeLabel}`
            : `Instagram ${typeLabel}`),
        }));
        setThumbnailLoading(true);

        try {
          const meta = await fetchInstagramMetadata(url);
          if (meta) {
            setFormData((prev) => ({
              ...prev,
              // Only overwrite title/description if user hasn't manually edited them
              title: prev.title === "" || prev.title.startsWith("Instagram ") || prev.title.includes("– Instagram")
                ? (meta.title || prev.title)
                : prev.title,
              description: prev.description || meta.description || "",
              image_url: meta.thumbnail || prev.image_url || "",
              thumbnail_url: meta.thumbnail || prev.thumbnail_url || "",
            }));

            const parts: string[] = [];
            if (meta.author) parts.push(`@${meta.author}`);
            if (meta.postType) parts.push(meta.postType);
            if (meta.thumbnail) parts.push("+ thumbnail");

            toast({
              title: `Instagram ${meta.postType || "Post"} detected ✓`,
              description: parts.length > 0
                ? `Auto-filled: ${parts.join(" · ")}`
                : "Title auto-filled from URL",
            });
          }
        } catch {
          // Metadata fetch failed — URL default is already set
          toast({
            title: `Instagram ${typeLabel} link saved`,
            description: "Couldn't fetch metadata — you can edit the title manually",
          });
        } finally {
          setThumbnailLoading(false);
        }
        return;
      }

      // ── Vimeo: auto-switch to video type ──────────────────────────────────
      if (source === "vimeo") {
        setFormData((prev) => ({ ...prev, media_type: "video" as MediaType }));
      }
    },
    []
  );

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToValidate = {
      ...formData,
      video_url: formData.video_url || undefined,
      thumbnail_url: formData.thumbnail_url || undefined,
      image_url: formData.image_url || undefined,
      location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
      location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
    };

    const result = gallerySchema.safeParse(dataToValidate);
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Build a clean DB payload with NO undefined values.
    // Supabase JS lists every object key in the URL `columns` param, but
    // JSON.stringify drops `undefined` values from the body, causing a
    // columns/body mismatch → PostgREST 400.  Using `null` instead of
    // `undefined` keeps serialization consistent.
    const v = result.data;
    const dataToSubmit: GalleryItemInsert = {
      title: v.title,
      description: v.description ?? null,
      image_url: v.image_url || "",
      media_type: v.media_type ?? null,
      video_url: v.video_url ?? null,
      thumbnail_url: v.thumbnail_url ?? null,
      location_name: v.location_name ?? null,
      location_lat: v.location_lat ?? null,
      location_lng: v.location_lng ?? null,
      display_order: v.display_order ?? 0,
      video_is_muted: v.video_is_muted ?? true,
      video_autoplay: v.video_autoplay ?? true,
      video_loop: v.video_loop ?? true,
      video_controls: v.video_controls ?? true,
      collection_name: v.collection_name ?? null,
      collection_cover: v.collection_cover ?? false,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("gallery_items")
          .update(dataToSubmit)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Gallery item updated ✓" });
      } else {
        const { error } = await supabase.from("gallery_items").insert([dataToSubmit]);
        if (error) throw error;
        toast({ title: "Gallery item created ✓" });
      }
      fetchItems();
      resetForm();
      setShowForm(false);
    } catch (error) {
      const err = error as { code?: string; message?: string };
      const isRls = err?.code === '42501' || /row-level security|permission denied/i.test(err?.message || '');
      console.error('[GalleryManager] save failed', err);
      toast({
        title: isRls ? "Permission denied" : "Error saving gallery item",
        description: isRls
          ? "Your account can't publish gallery items. Ask an admin to grant editor or coordinator role."
          : (err?.message || "Please try again"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("gallery_items").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Gallery item deleted" });
      fetchItems();
    } catch (error) {
      toast({
        title: "Error deleting gallery item",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description || "",
      image_url: item.image_url || "",
      media_type: (item.media_type as MediaType) || "image",
      video_url: item.video_url || "",
      thumbnail_url: item.thumbnail_url || "",
      location_name: item.location_name || "",
      location_lat: item.location_lat?.toString() || "",
      location_lng: item.location_lng?.toString() || "",
      display_order: item.display_order,
      video_is_muted: item.video_is_muted ?? true,
      video_autoplay: item.video_autoplay ?? true,
      video_loop: item.video_loop ?? true,
      video_controls: item.video_controls ?? true,
      collection_name: item.collection_name ?? "",
      collection_cover: item.collection_cover ?? false,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      media_type: "image",
      video_url: "",
      thumbnail_url: "",
      location_name: "",
      location_lat: "",
      location_lng: "",
      display_order: items.length,
      video_is_muted: true,
      video_autoplay: true,
      video_loop: true,
      video_controls: true,
      collection_name: "",
      collection_cover: false,
    });
    setEditingId(null);
  };

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Detect the URL source for the current form's video_url
  const currentSource = detectVideoSource(formData.video_url);
  const sourceInfo = currentSource ? SOURCE_LABELS[currentSource] : null;

  // Helper: effective thumbnail for a grid card
  const getCardThumbnail = (item: GalleryItem): string => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.image_url) return item.image_url;
    if (item.media_type === "video" && item.video_url) {
      const yt = getYouTubeThumbnail(item.video_url);
      if (yt) return yt;
    }
    return ""; // will show placeholder
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Gallery Manager
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage images, videos, and Instagram embeds
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          size="lg"
          className="btn-glow px-8 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Item
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: items.length, icon: ImageIcon, color: "text-primary" },
          { label: "Images", value: items.filter(i => i.media_type === "image").length, icon: ImageIcon, color: "text-blue-500" },
          { label: "Videos", value: items.filter(i => i.media_type === "video").length, icon: Video, color: "text-purple-500" },
          { label: "Instagram", value: items.filter(i => i.media_type === "instagram").length, icon: Instagram, color: "text-pink-500" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("text-3xl font-bold mb-1", stat.color)}>{stat.value}</div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
                <stat.icon className={cn("h-8 w-8 opacity-20", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search gallery items..."
          className="pl-10 w-full md:w-96 bg-background/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── Form Card ──────────────────────────────────────────────────────── */}
      {showForm && (
        <Card className="glass-card border-primary/30 animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {editingId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                  {editingId ? "Edit Gallery Item" : "Add New Gallery Item"}
                </CardTitle>
                <CardDescription>
                  Supports images, direct/YouTube/Vimeo videos, and Instagram posts & reels
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ── Left Column – Media ───────────────────────────────── */}
                <div className="space-y-4">
                  {/* Media Type Toggle */}
                  <div className="flex gap-2">
                    {(["image", "video", "instagram"] as MediaType[]).map((type) => {
                      const icons = { image: ImageIcon, video: Video, instagram: Instagram };
                      const Icon = icons[type];
                      return (
                        <Button
                          key={type}
                          type="button"
                          variant={formData.media_type === type ? "default" : "outline"}
                          onClick={() => setFormData(prev => ({ ...prev, media_type: type }))}
                          className="flex-1 capitalize"
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {type === "instagram" ? "Instagram" : type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      );
                    })}
                  </div>

                  {/* File Upload — only for image/video */}
                  {formData.media_type !== "instagram" && (
                    <>
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {formData.media_type === "video" ? "Video Upload" : "Image Upload"}
                      </Label>
                      <FileUpload
                        onUploadComplete={(url) => {
                          if (formData.media_type === "video") {
                            setFormData(prev => ({ ...prev, video_url: url }));
                          } else {
                            setFormData(prev => ({ ...prev, image_url: url }));
                          }
                        }}
                        bucketName="gallery"
                        label={`Drop your ${formData.media_type} here or click to browse`}
                        accept={
                          formData.media_type === "video"
                            ? { "video/*": [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi", ".3gp"] }
                            : { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".heic", ".heif"] }
                        }
                      />
                    </>
                  )}

                  {/* Instagram hint */}
                  {formData.media_type === "instagram" && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 space-y-1.5">
                      <p className="text-sm font-semibold flex items-center gap-2 text-pink-400">
                        <Instagram className="w-4 h-4" /> Instagram Embed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paste the URL of a public Instagram post, reel, or IGTV video below.
                        Instagram must be set to public for the embed to appear.
                      </p>
                      <p className="text-xs text-muted-foreground/70 font-mono">
                        e.g. instagram.com/p/ABC123/ · instagram.com/reel/XYZ/
                      </p>
                    </div>
                  )}

                  {/* Thumbnail upload (videos & instagram) */}
                  {formData.media_type !== "image" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Thumbnail Image
                        {formData.media_type === "video" && currentSource === "youtube" && (
                          <span className="ml-2 text-xs font-normal text-green-400 normal-case">
                            (auto-extracted from YouTube)
                          </span>
                        )}
                      </Label>
                      <FileUpload
                        onUploadComplete={(url) =>
                          setFormData(prev => ({ ...prev, image_url: url, thumbnail_url: url }))
                        }
                        bucketName="gallery"
                        label="Drop thumbnail image here (optional)"
                        accept={{ "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".heic", ".heif"] }}
                      />
                    </div>
                  )}

                  {/* Preview panel */}
                  <div className="pt-4 border-t border-border/50">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 block">
                      Preview
                    </Label>
                    <div className={cn(
                      "rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden relative",
                      formData.media_type === "instagram" ? "aspect-[4/5]" : "aspect-video"
                    )}>
                      {thumbnailLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      )}

                      {(formData.video_url || formData.image_url) ? (
                        <MediaPreview
                          mediaType={formData.media_type}
                          videoUrl={formData.video_url}
                          imageUrl={formData.image_url}
                          thumbnailUrl={formData.thumbnail_url}
                          title="Preview"
                          className="w-full h-full"
                          settings={{
                            autoplay: formData.video_autoplay,
                            mute: formData.video_is_muted,
                            loop: formData.video_loop,
                            controls: formData.video_controls
                          }}
                        />
                      ) : (
                        <div className="text-center space-y-2 p-8">
                          {formData.media_type === "instagram"
                            ? <Instagram className="h-10 w-10 mx-auto text-pink-400/50" />
                            : <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
                          }
                          <p className="text-sm text-muted-foreground">
                            {formData.media_type === "instagram"
                              ? "Enter an Instagram URL to preview"
                              : `Upload ${formData.media_type} to see preview`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video player settings */}
                  {formData.media_type === "video" && (
                    <Card className="bg-muted/30 border-primary/20">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-primary" />
                          Video Player Settings
                          <span className="text-xs font-normal text-muted-foreground">
                            (YouTube, Vimeo & direct)
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 py-3 px-4">
                        {[
                          { key: "video_is_muted", label: "Muted by Default", IconOn: VolumeX, IconOff: Volume2 },
                          { key: "video_autoplay", label: "Autoplay", IconOn: Play, IconOff: Play },
                          { key: "video_loop", label: "Loop Video", IconOn: Infinity, IconOff: Infinity },
                          { key: "video_controls", label: "Show Controls", IconOn: MonitorPlay, IconOff: MonitorPlay },
                        ].map(({ key, label, IconOn }) => (
                          <div key={key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <IconOn className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor={key} className="text-xs">{label}</Label>
                            </div>
                            <Switch
                              id={key}
                              checked={formData[key as keyof FormData] as boolean}
                              onCheckedChange={(checked) =>
                                setFormData(prev => ({ ...prev, [key]: checked }))
                              }
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* URL fields */}
                  {formData.media_type === "image" && (
                    <div>
                      <Label htmlFor="image_url">Image URL *</Label>
                      <Input
                        id="image_url"
                        value={formData.image_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        required
                        maxLength={500}
                        className="mt-1.5"
                      />
                    </div>
                  )}

                  {formData.media_type === "video" && (
                    <>
                      <div>
                        <Label htmlFor="video_url" className="flex items-center gap-2">
                          Video URL *
                          {sourceInfo && (
                            <Badge className={cn("text-[10px] px-2 py-0 text-white", sourceInfo.color)}>
                              {sourceInfo.label} detected
                            </Badge>
                          )}
                        </Label>
                        <Input
                          id="video_url"
                          value={formData.video_url}
                          onChange={(e) => handleVideoUrlChange(e.target.value)}
                          placeholder="YouTube, Vimeo, or direct MP4/WebM URL"
                          required
                          maxLength={500}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          YouTube thumbnails are auto-extracted ✨
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="image_url_video" className="flex items-center gap-2">
                          Thumbnail URL
                          {thumbnailLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        </Label>
                        <Input
                          id="image_url_video"
                          value={formData.image_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="Auto-filled for YouTube, or enter manually"
                          maxLength={500}
                          className="mt-1.5"
                        />
                      </div>
                    </>
                  )}

                  {formData.media_type === "instagram" && (
                    <>
                      <div>
                        <Label htmlFor="instagram_url" className="flex items-center gap-2">
                          Instagram Post / Reel URL *
                          {formData.video_url && getInstagramEmbedUrl(formData.video_url) && (
                            <Badge className="text-[10px] px-2 py-0 bg-pink-500/80 text-white">
                              Valid ✓
                            </Badge>
                          )}
                        </Label>
                        <Input
                          id="instagram_url"
                          value={formData.video_url}
                          onChange={(e) => handleVideoUrlChange(e.target.value)}
                          placeholder="https://www.instagram.com/p/ABC123/"
                          required
                          maxLength={500}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="image_url_ig">Thumbnail URL (optional)</Label>
                        <Input
                          id="image_url_ig"
                          value={formData.image_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="https://example.com/thumbnail.jpg"
                          maxLength={500}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Optional — shown as preview card thumbnail
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Right Column – Details ────────────────────────────── */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      maxLength={200}
                      className="mt-1.5 text-lg font-medium"
                      placeholder="Innovation Day 2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      maxLength={1000}
                      className="mt-1.5"
                      placeholder="Describe this moment..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location_name">Location</Label>
                      <Input
                        id="location_name"
                        value={formData.location_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                        maxLength={200}
                        className="mt-1.5"
                        placeholder="Main Hall"
                      />
                    </div>
                    <div>
                      <Label htmlFor="display_order">Display Order</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))
                        }
                        min={0}
                        max={999}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="collection_name">Collection Name (Optional)</Label>
                      <Input
                        id="collection_name"
                        value={formData.collection_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, collection_name: e.target.value }))}
                        maxLength={100}
                        className="mt-1.5"
                        placeholder="e.g. Science Fair 2024"
                      />
                    </div>
                    <div className="flex flex-col justify-center pt-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="collection_cover"
                          checked={formData.collection_cover}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, collection_cover: checked }))}
                        />
                        <Label htmlFor="collection_cover">Use as Collection Cover</Label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location_lat">Latitude</Label>
                      <Input
                        id="location_lat"
                        type="number"
                        step="any"
                        value={formData.location_lat}
                        onChange={(e) => setFormData(prev => ({ ...prev, location_lat: e.target.value }))}
                        placeholder="6.9271"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location_lng">Longitude</Label>
                      <Input
                        id="location_lng"
                        type="number"
                        step="any"
                        value={formData.location_lng}
                        onChange={(e) => setFormData(prev => ({ ...prev, location_lng: e.target.value }))}
                        placeholder="79.8612"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button type="submit" className="btn-glow flex-1">
                  {editingId ? "Update Item" : "Create Item"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Gallery Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const thumb = getCardThumbnail(item);
            const isInstagram = item.media_type === "instagram";

            return (
              <Card
                key={item.id}
                className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="aspect-square relative overflow-hidden bg-muted/20">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isInstagram
                        ? <Instagram className="h-12 w-12 text-pink-400/40" />
                        : <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
                      }
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-black/50 backdrop-blur-sm">
                      #{item.display_order}
                    </Badge>
                    {item.media_type === "video" && (
                      <Badge className="text-[10px] px-2 py-0.5 bg-purple-500/80 backdrop-blur-sm text-white">
                        <Play className="h-2 w-2 mr-1" />
                        {item.video_url ? SOURCE_LABELS[detectVideoSource(item.video_url) ?? "direct"]?.label ?? "Video" : "Video"}
                      </Badge>
                    )}
                    {isInstagram && (
                      <Badge className="text-[10px] px-2 py-0.5 bg-pink-500/80 backdrop-blur-sm text-white">
                        <Instagram className="h-2 w-2 mr-1" /> Instagram
                      </Badge>
                    )}
                    {item.collection_name && (
                      <Badge className="text-[10px] px-2 py-0.5 bg-blue-500/80 backdrop-blur-sm text-white border-blue-400">
                        {item.collection_name} {item.collection_cover && "★"}
                      </Badge>
                    )}
                  </div>

                  {/* Hover info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white font-bold text-sm truncate">{item.title}</p>
                    {item.location_name && (
                      <p className="text-white/70 text-xs flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {item.location_name}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-primary/80"
                      onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-destructive/80"
                      onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card py-20">
          <div className="text-center space-y-4">
            <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <div>
              <p className="text-lg font-medium text-muted-foreground">No gallery items found</p>
              <p className="text-sm text-muted-foreground/70">Start by adding your first item</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add First Item
            </Button>
          </div>
        </Card>
      )}

      {/* ── Lightbox Preview Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedItem?.media_type === "instagram" && <Instagram className="w-4 h-4 text-pink-400" />}
              {selectedItem?.title}
            </DialogTitle>
            {selectedItem?.description && (
              <DialogDescription className="line-clamp-2">{selectedItem.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
            {selectedItem && (
              <div className={cn(
                "relative w-full overflow-hidden rounded-lg bg-muted",
                selectedItem.media_type === "instagram"
                  ? "max-h-[55vh] aspect-[4/5] mx-auto"
                  : "max-h-[55vh] aspect-video"
              )}>
                <MediaPreview
                  mediaType={selectedItem.media_type as MediaType}
                  videoUrl={selectedItem.video_url ?? undefined}
                  imageUrl={selectedItem.image_url}
                  thumbnailUrl={selectedItem.thumbnail_url ?? undefined}
                  title={selectedItem.title}
                  className="w-full h-full"
                  settings={{
                    autoplay: selectedItem.video_autoplay,
                    mute: selectedItem.video_is_muted,
                    loop: selectedItem.video_loop,
                    controls: selectedItem.video_controls
                  }}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <div className="flex flex-col gap-1 min-w-0">
                {selectedItem?.location_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{selectedItem.location_name}</span>
                  </p>
                )}
                {selectedItem?.video_url && (
                  <a
                    href={selectedItem.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground/70 flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" /> Open original
                  </a>
                )}
              </div>

              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  onClick={() => { if (selectedItem) { handleEdit(selectedItem); setSelectedItem(null); } }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 sm:flex-initial"
                  onClick={() => { if (selectedItem) { setItemToDelete(selectedItem.id); setSelectedItem(null); } }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ───────────────────────────────────────────── */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery Item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) { handleDelete(itemToDelete); setItemToDelete(null); }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GalleryManager;