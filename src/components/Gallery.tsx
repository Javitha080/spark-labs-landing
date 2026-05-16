import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// Lazy-load Map component (MapLibre GL is ~276KB gzipped)
const Map = lazy(() => import("./Map"));
import { X, MapPin, ArrowUpRight, Play, ChevronLeft, ChevronRight, Instagram, ExternalLink, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  media_type?: string;       // "image" | "video" | "instagram"
  video_url?: string | null;
  thumbnail_url?: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  display_order: number;
  // Video settings (direct video only)
  video_is_muted?: boolean;
  video_autoplay?: boolean;
  video_loop?: boolean;
  video_controls?: boolean;
}

// ─── URL Utilities (shared) ─────────────────────────────────────────────────

import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getVimeoEmbedUrl,
  getInstagramEmbedUrl,
  getYouTubeThumbnail,
  detectVideoSource,
} from "@/lib/mediaUtils";

// Re-export for GalleryPage backward compatibility
export { getYouTubeEmbedUrl, getVimeoEmbedUrl, getInstagramEmbedUrl, detectVideoSource };

// ─── BentoItem ─────────────────────────────────────────────────────────────────

const BentoItem = ({
  image,
  index,
  onClick,
  size = "normal",
}: {
  image: GalleryImage;
  index: number;
  onClick: () => void;
  size?: "large" | "tall" | "wide" | "normal";
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });

  const sizeClasses = {
    large: "lg:col-span-2 lg:row-span-2",
    tall: "lg:row-span-2",
    wide: "lg:col-span-2",
    normal: "",
  };

  // Resolve thumbnail: prefer explicit thumbnail_url, then image_url,
  // then auto-derive from YouTube video_url
  const thumbSrc =
    image.thumbnail_url ||
    image.image_url ||
    (image.video_url ? getYouTubeThumbnail(image.video_url) : null) ||
    "";

  const isInstagram = image.media_type === "instagram";
  const isVideo = image.media_type === "video";

  return (
    <div
      ref={ref}
      className={cn(
        "group cursor-pointer relative overflow-hidden rounded-[2rem] bg-card border border-border/50",
        "hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10",
        "hover:scale-[1.02]",
        sizeClasses[size],
        isVisible ? "animate-fade-up" : "opacity-0"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={onClick}
    >
      {isVisible ? (
        <>
          <div className="absolute inset-0 z-0">
            {thumbSrc ? (
              <OptimizedImage
                src={thumbSrc}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              // Fallback gradient for items with no thumbnail (e.g. Instagram without thumbnail)
              <div className={cn(
                "w-full h-full",
                isInstagram
                  ? "bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-orange-400/20"
                  : "bg-muted/30"
              )} />
            )}

            {/* Play indicator for videos */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-16 h-16 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-foreground fill-foreground" />
                </div>
              </div>
            )}

            {/* Instagram indicator */}
            {isInstagram && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/60 to-purple-600/60 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Instagram className="w-8 h-8 text-white" />
                </div>
              </div>
            )}

            {/* Overlay gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-60" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
            <div className="flex justify-between items-start mb-auto">
              {image.location_name && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-border/50 text-foreground text-xs font-bold opacity-0 group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <MapPin className="h-3 w-3" />
                  {image.location_name}
                </div>
              )}
              <div className="ml-auto w-10 h-10 rounded-full bg-background/40 backdrop-blur-md border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <ArrowUpRight className="h-4 w-4 text-foreground" />
              </div>
            </div>

            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              <h3 className="text-foreground font-bold text-lg md:text-xl mb-1 line-clamp-2 leading-tight drop-shadow-md">
                {image.title}
              </h3>
              {image.description && (
                <p className="text-muted-foreground text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 font-medium">
                  {image.description}
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

// ─── Gallery ───────────────────────────────────────────────────────────────────

const Gallery = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const { ref: headerRef } = useScrollAnimation();

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  const goToPrev = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return prev === 0 ? images.length - 1 : prev - 1;
    });
  }, [images.length]);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return prev === images.length - 1 ? 0 : prev + 1;
    });
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", onKey);
    // REMOVED: document.body.style.overflow = "hidden";
    lightboxRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedIndex, closeLightbox, goToPrev, goToNext]);

  // Auto-focus lightbox
  useEffect(() => {
    if (selectedIndex !== null && lightboxRef.current) {
      lightboxRef.current.focus();
    }
  }, [selectedIndex]);

  const fetchGalleryItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("display_order", { ascending: true })
        .limit(8);

      if (error) throw error;
      setImages(data || []);
    } catch {
      toast({
        title: "Error loading gallery",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleryItems();
  }, [fetchGalleryItems]);

  useRealtimeSync(["gallery_items"], { onUpdate: fetchGalleryItems });

  // Bento layout pattern
  const getBentoSize = (index: number): "large" | "tall" | "wide" | "normal" => {
    const pattern: Array<"large" | "tall" | "wide" | "normal"> = [
      "large", "normal", "normal",
      "normal", "tall", "normal",
      "wide", "normal",
      "normal", "normal", "tall",
      "normal", "large",
    ];
    return pattern[index % pattern.length];
  };

  const mapLocations = images
    .filter((img) => img.location_lat && img.location_lng)
    .map((img) => ({
      lat: parseFloat(String(img.location_lat)),
      lng: parseFloat(String(img.location_lng)),
      title: img.title,
      description: img.location_name || undefined,
    }));

  // ── Lightbox media renderer ─────────────────────────────────────────────
  const renderLightboxMedia = (image: GalleryImage) => {
    const isInstagram = image.media_type === "instagram";
    const isVideo = image.media_type === "video";

    if (isInstagram && image.video_url) {
      const embedUrl = getInstagramEmbedUrl(image.video_url);
      if (embedUrl) {
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black" style={{ minHeight: 500 }}>
              <iframe
                src={embedUrl}
                className="w-full border-0"
                style={{ height: 560, overflow: "hidden" }}
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

    if (isVideo && image.video_url) {
      const source = detectVideoSource(image.video_url);

      if (source === "youtube") {
        return (
          <iframe
            src={getYouTubeEmbedUrl(image.video_url, {
              autoplay: image.video_autoplay,
              mute: image.video_is_muted,
              loop: image.video_loop,
              controls: image.video_controls
            })}
            className="w-full aspect-video rounded-2xl shadow-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={image.title}
          />
        );
      }

      if (source === "vimeo") {
        return (
          <iframe
            src={getVimeoEmbedUrl(image.video_url, {
              autoplay: image.video_autoplay,
              mute: image.video_is_muted,
              loop: image.video_loop
            })}
            className="w-full aspect-video rounded-2xl shadow-2xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={image.title}
          />
        );
      }

      // Direct video file
      return (
        <video
          src={image.video_url}
          poster={image.thumbnail_url || image.image_url}
          controls={image.video_controls ?? true}
          autoPlay={image.video_autoplay ?? true}
          loop={image.video_loop ?? true}
          muted={image.video_is_muted ?? true}
          className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
        />
      );
    }

    // Image fallback
    return (
      <OptimizedImage
        src={image.image_url}
        alt={image.title}
        className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
      />
    );
  };

  return (
    <section id="gallery" className="section-padding relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/3 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4 border border-primary/20">
              📸 Our Moments
            </span>
          </TextReveal>
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Innovation{" "}
              <GradientTextReveal gradient="from-primary via-secondary to-accent">
                Gallery
              </GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Capturing moments of creativity, collaboration, and groundbreaking discoveries
            </p>
          </TextReveal>
        </div>

        {/* Map */}
        {mapLocations.length > 0 && (
          <TextReveal animation="scale">
            <div className="mb-16">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                Gallery Locations
              </h3>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <Suspense
                  fallback={
                    <div className="w-full h-[450px] md:h-[600px] bg-muted/30 animate-pulse rounded-2xl" />
                  }
                >
                  <Map locations={mapLocations} />
                </Suspense>
              </div>
            </div>
          </TextReveal>
        )}

        {/* Bento Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[240px]">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl bg-muted/30 animate-pulse",
                  i === 0 ? "lg:col-span-2 lg:row-span-2" : "",
                  i === 4 ? "lg:row-span-2" : ""
                )}
              />
            ))}
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[240px] sm:auto-rows-[200px] md:auto-rows-[220px] lg:auto-rows-[220px] xl:auto-rows-[240px]">
            {images.map((image, index) => (
              <BentoItem
                key={image.id}
                image={image}
                index={index}
                size={getBentoSize(index)}
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-6 rounded-2xl bg-card border border-border/50">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📷</span>
            </div>
            <p className="text-lg font-medium text-muted-foreground">No gallery items available yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Check back soon for amazing moments!</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/gallery">
            <Button size="lg" className="rounded-full shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all text-sm font-bold uppercase tracking-widest px-8">
              View Full Gallery <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Lightbox - Half-Screen Card / Bottom Sheet */}
        {selectedImage && (
          <>
            {/* Desktop: Semi-transparent overlay on left side (click to close, does not block scroll) */}
            <div
              className="fixed inset-0 z-[190] bg-background/40 backdrop-blur-[2px] hidden md:block animate-in fade-in duration-200"
              style={{ width: '50%' }}
              onClick={closeLightbox}
            />
            {/* Mobile: Top overlay (click to close) */}
            <div
              className="fixed inset-0 z-[190] bg-background/60 backdrop-blur-[2px] md:hidden animate-in fade-in duration-200"
              onClick={closeLightbox}
            />

            <div
              ref={lightboxRef}
              role="dialog"
              aria-modal="false" // intentionally false so background is active
              tabIndex={0}
              className="fixed z-[200] bg-background/95 backdrop-blur-3xl border-t md:border-t-0 md:border-l border-white/10 shadow-2xl flex flex-col p-4 md:p-8 
                         bottom-0 left-0 right-0 h-[75vh] rounded-t-[2.5rem] md:rounded-t-none
                         md:top-0 md:bottom-0 md:left-auto md:right-0 md:h-auto md:w-[50vw] md:rounded-l-[2.5rem] overflow-y-auto
                         animate-in slide-in-from-bottom-full md:slide-in-from-right-full duration-300 outline-none"
            >
              {/* Mobile Drag Indicator */}
              <div className="w-16 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />

              <div className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 z-[210]">
                {images.length > 1 && (
                  <div className="flex bg-background/50 backdrop-blur-xl border border-white/15 rounded-full overflow-hidden mr-2">
                    <button
                      aria-label="Previous"
                      onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                      className="p-2.5 hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-px bg-white/10" />
                    <button
                      aria-label="Next"
                      onClick={(e) => { e.stopPropagation(); goToNext(); }}
                      className="p-2.5 hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <button
                  aria-label="Close gallery"
                  onClick={closeLightbox}
                  className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-xl border border-white/15 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Media container */}
              <div className="w-full mt-4 md:mt-12 flex-1 flex flex-col">
                <div className="w-full relative rounded-3xl overflow-hidden border border-white/5 bg-black">
                  {renderLightboxMedia(selectedImage)}
                </div>

                {/* Meta */}
                <div className="mt-8 px-2 pb-8">
                  <h3 className="text-2xl md:text-3xl font-display font-bold mb-3 flex items-center gap-3">
                    {selectedImage.media_type === "instagram" && (
                      <Instagram className="w-7 h-7 text-pink-500" />
                    )}
                    {selectedImage.title}
                  </h3>
                  
                  {selectedImage.location_name && (
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 mb-4">
                      <MapPin className="h-3.5 w-3.5" /> {selectedImage.location_name}
                    </span>
                  )}

                  {selectedImage.description && (
                    <p className="text-muted-foreground text-base md:text-lg leading-relaxed">{selectedImage.description}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Gallery;