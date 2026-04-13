import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// Lazy-load Map component (MapLibre GL is ~276KB gzipped)
const Map = lazy(() => import("./Map"));
import { X, MapPin, ArrowUpRight, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import OptimizedImage from "@/components/ui/OptimizedImage";

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  media_type?: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  display_order: number;
  // Video settings
  video_is_muted?: boolean;
  video_autoplay?: boolean;
  video_loop?: boolean;
  video_controls?: boolean;
}

const BentoItem = ({
  image,
  index,
  onClick,
  size = "normal"
}: {
  image: GalleryImage;
  index: number;
  onClick: () => void;
  size?: "large" | "tall" | "wide" | "normal";
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true,
  });

  const sizeClasses = {
    large: "lg:col-span-2 lg:row-span-2",
    tall: "lg:row-span-2",
    wide: "lg:col-span-2",
    normal: "",
  };

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
      <div className="absolute inset-0 z-0">
        <OptimizedImage
          src={image.thumbnail_url || image.image_url}
          alt={image.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Video play indicator */}
        {image.media_type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-16 h-16 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-foreground fill-foreground" />
            </div>
          </div>
        )}
        {/* Modern Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-60" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
        <div className="flex justify-between items-start mb-auto">
          {/* Location badge */}
          {image.location_name && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-border/50 text-foreground text-xs font-bold opacity-0 group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <MapPin className="h-3 w-3" />
              {image.location_name}
            </div>
          )}

          {/* Arrow indicator */}
          <div className="ml-auto w-10 h-10 rounded-full bg-background/40 backdrop-blur-md border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <ArrowUpRight className="h-4 w-4 text-foreground" />
          </div>
        </div>

        {/* Title and description */}
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
    </div>
  );
};

const Gallery = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, closeLightbox, goToPrev, goToNext]);

  // Auto-focus lightbox when it opens
  useEffect(() => {
    if (selectedIndex !== null && lightboxRef.current) {
      lightboxRef.current.focus();
    }
  }, [selectedIndex]);

  const fetchGalleryItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
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

  // Determine size for bento layout
  const getBentoSize = (index: number): "large" | "tall" | "wide" | "normal" => {
    const pattern = [
      "large", "normal", "normal",
      "normal", "tall", "normal",
      "wide", "normal",
      "normal", "normal", "tall",
      "normal", "large"
    ];
    return pattern[index % pattern.length] as "large" | "tall" | "wide" | "normal";
  };

  const mapLocations = images
    .filter(img => img.location_lat && img.location_lng)
    .map(img => ({
      lat: parseFloat(String(img.location_lat)),
      lng: parseFloat(String(img.location_lng)),
      title: img.title,
      description: img.location_name || undefined,
    }));

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
              Innovation <GradientTextReveal gradient="from-primary via-secondary to-accent">Gallery</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Capturing moments of creativity, collaboration, and groundbreaking discoveries
            </p>
          </TextReveal>
        </div>

        {/* Map showing gallery locations */}
        {mapLocations.length > 0 && (
          <TextReveal animation="scale">
            <div className="mb-16">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                Gallery Locations
              </h3>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <Suspense fallback={<div className="w-full h-[450px] md:h-[600px] bg-muted/30 animate-pulse rounded-2xl" />}>
                  <Map locations={mapLocations} />
                </Suspense>
              </div>
            </div>
          </TextReveal>
        )}

        {/* Bento Grid Gallery */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[240px] sm:auto-rows-[200px] md:auto-rows-[220px] lg:auto-rows-[220px]">
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

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            ref={lightboxRef}
            role="dialog"
            aria-modal="true"
            tabIndex={0}
            className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-xl outline-none"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-muted/50 hover:bg-muted text-foreground flex items-center justify-center transition-all hover:scale-110 group z-10"
              onClick={closeLightbox}
              aria-label="Close gallery"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>

            {/* Previous button */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-muted/50 hover:bg-muted text-foreground flex items-center justify-center transition-all hover:scale-110 z-10"
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Next button */}
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-muted/50 hover:bg-muted text-foreground flex items-center justify-center transition-all hover:scale-110 z-10"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Image/Video container */}
            <div
              className="relative max-w-6xl w-full animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedImage.media_type === "video" && selectedImage.video_url ? (
                // Video Player
                selectedImage.video_url.includes("youtube.com") || selectedImage.video_url.includes("youtu.be") ? (
                  <iframe
                    src={getYouTubeEmbedUrl(selectedImage.video_url, selectedImage.video_autoplay ?? true)}
                    className="w-full aspect-video rounded-2xl shadow-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : selectedImage.video_url.includes("vimeo.com") ? (
                  <iframe
                    src={getVimeoEmbedUrl(selectedImage.video_url, selectedImage.video_autoplay ?? true)}
                    className="w-full aspect-video rounded-2xl shadow-2xl"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={selectedImage.video_url}
                    controls={selectedImage.video_controls ?? true}
                    autoPlay={selectedImage.video_autoplay ?? true}
                    loop={selectedImage.video_loop ?? true}
                    muted={selectedImage.video_is_muted ?? true}
                    className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                  />
                )
              ) : (
                <OptimizedImage
                  src={selectedImage.image_url}
                  alt={selectedImage.title}
                  className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                />
              )}

              {/* Image info */}
              <div className="mt-6 text-center space-y-2">
                <h3 className="text-2xl font-bold text-foreground">{selectedImage.title}</h3>
                {selectedImage.description && (
                  <p className="text-muted-foreground max-w-2xl mx-auto">{selectedImage.description}</p>
                )}
                {selectedImage.location_name && (
                  <p className="text-muted-foreground/70 text-sm flex items-center justify-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {selectedImage.location_name}
                  </p>
                )}
              </div>

              {/* Decorative glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-3xl -z-10" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Helper functions for video embeds
function getYouTubeEmbedUrl(url: string, autoplay: boolean = true): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=${autoplay ? 1 : 0}&mute=1` : url;
}

function getVimeoEmbedUrl(url: string, autoplay: boolean = true): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=${autoplay ? 1 : 0}&muted=1` : url;
}

export default Gallery;
