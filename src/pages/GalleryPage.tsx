import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image, X, Play, Instagram, ExternalLink, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import ReactPlayer from "react-player";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

/* ===========================================
   GALLERY PAGE - Full photo/video/IG gallery with lightbox
   =========================================== */

type GalleryItem = Tables<"gallery_items">;
type GalleryItemWithVideo = GalleryItem;

// ─── URL Utilities ────────────────────────────────────────────────────────────

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
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Build a privacy-enhanced YouTube embed URL */
function getYouTubeEmbedUrl(url: string, settings?: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean }): string {
  const id = extractYouTubeId(url);
  if (!id) return url;
  const params = new URLSearchParams({
    autoplay: settings?.autoplay ? "1" : "0",
    mute: settings?.mute ? "1" : "0",
    controls: settings?.controls ? "1" : "0",
    loop: settings?.loop ? "1" : "0",
    playlist: settings?.loop ? id : "",
    rel: "0",
    modestbranding: "1"
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

type VideoSource = "youtube" | "vimeo" | "instagram" | "direct";

function detectVideoSource(url: string): VideoSource {
  if (!url) return "direct";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("instagram.com")) return "instagram";
  return "direct";
}

/** Resolve the best thumbnail for any gallery item */
function resolveThumb(item: GalleryItemWithVideo): string {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.image_url) return item.image_url;
  // Auto-derive from YouTube video URL
  if (item.video_url) {
    const yt = getYouTubeThumbnail(item.video_url);
    if (yt) return yt;
  }
  return "";
}

// ReactPlayer doesn't have React 19 types yet; cast to satisfy TS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player = ReactPlayer as any;

const GalleryPage = () => {
    const [items, setItems] = useState<GalleryItemWithVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [activeCollection, setActiveCollection] = useState<string | null>(null);

    // Group items into collections
    const collectionsMap = items.reduce((acc, item) => {
        const name = item.collection_name || "standalone";
        if (!acc[name]) acc[name] = { name, items: [], cover: null };
        acc[name].items.push(item);
        if (item.collection_cover || (!acc[name].cover && name !== "standalone")) {
            acc[name].cover = item;
        }
        return acc;
    }, {} as Record<string, { name: string; items: GalleryItemWithVideo[]; cover: GalleryItemWithVideo | null }>);

    const collections = Object.values(collectionsMap).filter(c => c.name !== "standalone");
    const standaloneItems = collectionsMap["standalone"]?.items || [];
    const activeItems = activeCollection ? (collectionsMap[activeCollection]?.items || []) : standaloneItems;

    const selectedItem = selectedIndex !== null && activeItems ? activeItems[selectedIndex] : null;

    const closeLightbox = useCallback(() => setSelectedIndex(null), []);

    const goToPrev = useCallback(() => {
        setSelectedIndex((prev) => {
            if (prev === null) return null;
            return prev === 0 ? activeItems.length - 1 : prev - 1;
        });
    }, [activeItems.length]);

    const goToNext = useCallback(() => {
        setSelectedIndex((prev) => {
            if (prev === null) return null;
            return prev === activeItems.length - 1 ? 0 : prev + 1;
        });
    }, [activeItems.length]);

    // Keyboard navigation
    useEffect(() => {
        if (selectedIndex === null) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") goToPrev();
            if (e.key === "ArrowRight") goToNext();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, closeLightbox, goToPrev, goToNext]);

    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const { data, error } = await supabase
                    .from("gallery_items")
                    .select("*")
                    .order("display_order", { ascending: true });

                if (error) throw error;
                setItems(data || []);
            } catch (error) {
                console.error("Error loading gallery:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGallery();
    }, []);

    // ─── Lightbox media renderer ─────────────────────────────────────────
    const renderLightboxMedia = (image: GalleryItemWithVideo) => {
        const isInstagram = image.media_type === "instagram";
        const isVideo = image.media_type === "video";

        // ── Instagram embed ─────────────────────────────────────────────
        if (isInstagram && image.video_url) {
            const embedUrl = getInstagramEmbedUrl(image.video_url);
            if (embedUrl) {
                return (
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black"
                            style={{ minHeight: 500 }}
                        >
                            <iframe
                                src={embedUrl}
                                className="w-full border-0"
                                style={{ height: 560 }}
                                allowFullScreen
                                title={image.title}
                            />
                        </div>
                        <a
                            href={image.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-pink-400 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View on Instagram
                        </a>
                    </div>
                );
            }
        }

        // ── Video (YouTube / Vimeo / Direct) ────────────────────────────
        if (isVideo && image.video_url) {
            const source = detectVideoSource(image.video_url);

            // ReactPlayer handles YouTube, Vimeo, and direct files
            if (source === "youtube") {
                return (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                        <iframe
                            src={getYouTubeEmbedUrl(image.video_url, {
                                autoplay: image.video_autoplay,
                                mute: image.video_is_muted,
                                loop: image.video_loop,
                                controls: image.video_controls
                            })}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={image.title}
                        />
                    </div>
                );
            }

            if (source === "vimeo") {
                return (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                        <iframe
                            src={getVimeoEmbedUrl(image.video_url, {
                                autoplay: image.video_autoplay,
                                mute: image.video_is_muted,
                                loop: image.video_loop
                            })}
                            className="w-full h-full border-0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            title={image.title}
                        />
                    </div>
                );
            }

            // Direct video file
            return (
                <video
                    src={image.video_url}
                    poster={resolveThumb(image)}
                    controls={image.video_controls ?? true}
                    autoPlay={image.video_autoplay ?? true}
                    loop={image.video_loop ?? true}
                    muted={image.video_is_muted ?? true}
                    className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                />
            );
        }

        // ── Image fallback ──────────────────────────────────────────────
        return (
            <img
                src={image.image_url}
                alt={image.title}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <SEOHead
                title="Photo Gallery | Young Innovators Club"
                description="Browse photos from workshops, events, and achievements of the Young Innovators Club at Dharmapala Vidyalaya."
                path="/gallery"
            />
            <Header />
            <main className="pt-24">
                {/* Page Header */}
                <section className="section-padding bg-background border-b border-border">
                    <div className="container-custom">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Link to="/">
                                <Button variant="ghost" className="mb-6 -ml-4 hover:bg-white/5">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Button>
                            </Link>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4">
                                {activeCollection ? activeCollection : <>Photo <span className="text-primary">Gallery</span></>}
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                {activeCollection ? `Viewing collection: ${activeCollection}` : "Captured moments from our workshops, events, and achievements."}
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Gallery Grid */}
                <section className="section-padding relative">
                    {/* Liquid glass background glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50 mix-blend-screen" />
                    
                    <div className="container-custom relative z-10">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="aspect-square rounded-2xl bg-muted/30 animate-pulse backdrop-blur-md" />
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-16">
                                <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No gallery items yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {activeCollection && (
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                        <Button variant="outline" className="bg-background/40 backdrop-blur-md border-white/10 hover:bg-white/10" onClick={() => setActiveCollection(null)}>
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back to Collections
                                        </Button>
                                    </motion.div>
                                )}

                                {!activeCollection && collections.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[250px] md:auto-rows-[300px]">
                                        {collections.map((col, index) => {
                                            const thumb = col.cover ? resolveThumb(col.cover) : null;
                                            const isLarge = index % 5 === 0; // Make every 5th collection a large bento box
                                            return (
                                                <motion.div
                                                    key={col.name}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                                    className={cn(
                                                        "group relative rounded-3xl overflow-hidden cursor-pointer shadow-xl",
                                                        "bg-white/5 border border-white/10 backdrop-blur-xl",
                                                        "transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20",
                                                        isLarge ? "md:col-span-2 md:row-span-2" : "col-span-1 row-span-1"
                                                    )}
                                                    onClick={() => setActiveCollection(col.name)}
                                                >
                                                    {thumb ? (
                                                        <img src={thumb} alt={col.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20" />
                                                    )}
                                                    
                                                    {/* Glass Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                                                    
                                                    <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-3 transition-transform group-hover:-translate-y-1">
                                                            <Image className="w-4 h-4 text-white" />
                                                            <span className="text-xs font-medium text-white">{col.items.length} Items</span>
                                                        </div>
                                                        <h3 className={cn("text-white font-bold tracking-tight transition-transform group-hover:-translate-y-1", isLarge ? "text-3xl md:text-4xl" : "text-xl md:text-2xl")}>
                                                            {col.name}
                                                        </h3>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {(!activeCollection && standaloneItems.length > 0) && collections.length > 0 && (
                                    <div className="mt-8 mb-4 flex items-center">
                                        <h2 className="text-2xl font-semibold">Other Media</h2>
                                        <div className="h-px bg-border flex-1 ml-6" />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {activeItems.map((item, index) => {
                                        const thumb = resolveThumb(item);
                                        const isInstagram = item.media_type === "instagram";
                                        const isVideo = item.media_type === "video";

                                        return (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05, duration: 0.4 }}
                                                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-white/5 border border-white/10 backdrop-blur-lg hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                                                onClick={() => setSelectedIndex(index)}
                                            >
                                                {/* Thumbnail image */}
                                                {thumb ? (
                                                    <img
                                                        src={thumb}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className={cn(
                                                        "w-full h-full flex items-center justify-center",
                                                        isInstagram
                                                            ? "bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-orange-400/20"
                                                            : "bg-muted/30"
                                                    )}>
                                                        {isInstagram ? (
                                                            <Instagram className="w-12 h-12 text-pink-400/50" />
                                                        ) : (
                                                            <Image className="w-12 h-12 text-muted-foreground/30" />
                                                        )}
                                                    </div>
                                                )}

                                                {/* Video play indicator */}
                                                {isVideo && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                                                            <Play className="w-6 h-6 fill-current" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Instagram indicator */}
                                                {isInstagram && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/80 to-purple-600/80 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                                                            <Instagram className="w-6 h-6 text-white" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                                        <h3 className="text-white font-semibold text-sm line-clamp-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                            {item.title}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {/* Media type badge */}
                                                {(isVideo || isInstagram) && (
                                                    <div className="absolute top-2 left-2">
                                                        <span className={cn(
                                                            "text-[10px] px-2 py-0.5 rounded-full text-white font-medium backdrop-blur-md border border-white/20 shadow-lg",
                                                            isInstagram ? "bg-pink-500/80" : "bg-purple-500/80"
                                                        )}>
                                                            {isInstagram ? "Instagram" : (
                                                                item.video_url ? detectVideoSource(item.video_url).charAt(0).toUpperCase() + detectVideoSource(item.video_url).slice(1) : "Video"
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />

            {/* Lightbox */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={closeLightbox}
                    >
                        {/* Close */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
                            onClick={closeLightbox}
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        {/* Prev */}
                        {items.length > 1 && (
                            <button
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 z-10"
                                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                                aria-label="Previous item"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}

                        {/* Next */}
                        {items.length > 1 && (
                            <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 z-10"
                                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                                aria-label="Next item"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}

                        {/* Media container */}
                        <motion.div
                            key={selectedItem.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-5xl w-full relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {renderLightboxMedia(selectedItem)}

                            {/* Meta info */}
                            <div className="mt-6 text-center space-y-2">
                                <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                                    {selectedItem.media_type === "instagram" && (
                                        <Instagram className="w-5 h-5 text-pink-400" />
                                    )}
                                    {selectedItem.title}
                                </h3>
                                {selectedItem.description && (
                                    <p className="text-white/70 max-w-2xl mx-auto">{selectedItem.description}</p>
                                )}
                                {selectedItem.location_name && (
                                    <p className="text-white/50 text-sm flex items-center justify-center gap-1.5">
                                        <MapPin className="h-4 w-4" /> {selectedItem.location_name}
                                    </p>
                                )}
                                {/* External link for Instagram & YouTube */}
                                {selectedItem.video_url && (
                                    <a
                                        href={selectedItem.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-primary transition-colors mt-2"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        {selectedItem.media_type === "instagram" ? "View on Instagram" : "Open original"}
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GalleryPage;
