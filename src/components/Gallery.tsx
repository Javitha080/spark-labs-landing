import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Map from "./Map";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { X } from "lucide-react";

// Separate component for each gallery item to properly use hooks
const GalleryItem = ({ 
  image, 
  index, 
  onClick 
}: { 
  image: any; 
  index: number; 
  onClick: () => void;
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className={`masonry-item group cursor-pointer ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500">
        <img
          src={image.image_url}
          alt={image.title}
          className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          {image.location_name && (
            <span className="inline-block self-start px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
              {image.location_name}
            </span>
          )}
          <p className="text-white font-bold text-lg mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-150">
            {image.title}
          </p>
          {image.description && (
            <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
              {image.description}
            </p>
          )}
        </div>
        <div className="absolute inset-0 border-4 border-transparent group-hover:border-primary/50 rounded-2xl transition-all duration-500 pointer-events-none" />
      </div>
    </div>
  );
};

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
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

  const mapLocations = images
    .filter(img => img.location_lat && img.location_lng)
    .map(img => ({
      lat: parseFloat(img.location_lat),
      lng: parseFloat(img.location_lng),
      title: img.title,
      description: img.location_name,
    }));

  return (
    <section id="gallery" className="section-padding relative overflow-hidden">
      {/* Background decoration */}
      < div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Innovation <GradientTextReveal gradient="from-primary via-secondary to-accent">Gallery</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Capturing moments of creativity, collaboration, and discovery
            </p>
          </TextReveal>
        </div>

        {/* Map showing gallery locations */}
        {mapLocations.length > 0 && (
          <TextReveal animation="scale">
            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6">Gallery Locations</h3>
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <Map locations={mapLocations} />
              </div>
            </div>
          </TextReveal>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground animate-pulse py-12">Loading gallery...</div>
        ) : images.length > 0 ? (
          /* Masonry Grid Layout */
          <div className="masonry-grid">
            {images.map((image, index) => (
              <GalleryItem
                key={image.id}
                image={image}
                index={index}
                onClick={() => setSelectedImage(image.image_url)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg">No gallery items available yet.</p>
            <p className="text-sm mt-2">Check back soon for amazing moments!</p>
          </div>
        )}

        {/* Lightbox Modal with modern design */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xl"
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
            <div className="relative max-w-6xl max-h-[90vh] animate-scale-in">
              <img
                src={selectedImage}
                alt="Gallery view"
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />

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
