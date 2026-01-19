import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Map from "./Map";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { X, MapPin, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  display_order: number;
}

// Bento grid item component
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
    large: "md:col-span-2 md:row-span-2",
    tall: "md:row-span-2",
    wide: "md:col-span-2",
    normal: "",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "group cursor-pointer relative overflow-hidden rounded-2xl bg-card border border-border/50",
        "hover:border-primary/50 transition-all duration-500",
        sizeClasses[size],
        isVisible ? "animate-fade-up" : "opacity-0"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={onClick}
    >
      <div className="absolute inset-0">
        <img
          src={image.image_url}
          alt={image.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
        {/* Location badge */}
        {image.location_name && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <MapPin className="h-3 w-3" />
            {image.location_name}
          </div>
        )}

        {/* Arrow indicator */}
        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <ArrowUpRight className="h-4 w-4 text-white" />
        </div>

        {/* Title and description */}
        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <h3 className="text-white font-bold text-lg md:text-xl mb-1 line-clamp-2">
            {image.title}
          </h3>
          {image.description && (
            <p className="text-white/70 text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
              {image.description}
            </p>
          )}
        </div>
      </div>

      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-xl" />
      </div>
    </div>
  );
};

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  useEffect(() => {
    const fetchGalleryItems = async () => {
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
    };

    fetchGalleryItems();
  }, []);

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
                <Map locations={mapLocations} />
              </div>
            </div>
          </TextReveal>
        )}

        {/* Bento Grid Gallery */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[250px]">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl bg-muted/30 animate-pulse",
                  i === 0 ? "md:col-span-2 md:row-span-2" : "",
                  i === 4 ? "md:row-span-2" : ""
                )}
              />
            ))}
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[220px]">
            {images.map((image, index) => (
              <BentoItem
                key={image.id}
                image={image}
                index={index}
                size={getBentoSize(index)}
                onClick={() => setSelectedImage(image)}
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
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-xl"
            onClick={() => setSelectedImage(null)}
          >
            {/* Close button */}
            <button
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-110 group z-10"
              onClick={() => setSelectedImage(null)}
              aria-label="Close gallery"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>

            {/* Image container */}
            <div
              className="relative max-w-6xl w-full animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title}
                className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />

              {/* Image info */}
              <div className="mt-6 text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">{selectedImage.title}</h3>
                {selectedImage.description && (
                  <p className="text-white/70 max-w-2xl mx-auto">{selectedImage.description}</p>
                )}
                {selectedImage.location_name && (
                  <p className="text-white/50 text-sm flex items-center justify-center gap-1.5">
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

export default Gallery;
