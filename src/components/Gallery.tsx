import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Gallery = () => {
  const [images, setImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { ref, isVisible } = useScrollAnimation(0.1);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data, error } = await supabase.from('gallery_items').select('*').order('display_order');
        if (error) throw error;
        setImages(data || []);
      } catch (error) {
        toast({ title: "Error loading gallery", variant: "destructive" });
      }
    };
    fetchGallery();
  }, []);

  return (
    <section id="gallery" ref={ref} className="section-padding bg-background">
      <div className="container-custom">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground"><span className="text-primary">Gallery</span></h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">Capturing moments of innovation</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {images.map((img, idx) => (
            <div key={img.id} className={`rounded-3xl overflow-hidden cursor-pointer hover:scale-105 transition-transform ${isVisible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${idx * 0.1}s` }} onClick={() => setSelectedImage(img.image_url)}>
              <img src={img.image_url} alt={img.title} className="w-full h-64 object-cover" />
            </div>
          ))}
        </div>
        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage} alt="Full size" className="max-w-full max-h-full rounded-2xl" />
          </div>
        )}
      </div>
    </section>
  );
};

export default Gallery;
