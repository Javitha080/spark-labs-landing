import { useState } from "react";
import solarImage from "@/assets/project-solar.jpg";
import roboticsImage from "@/assets/project-robotics.jpg";
import ecoImage from "@/assets/project-eco.jpg";
import heroImage from "@/assets/hero-innovation.jpg";

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const images = [
    { src: heroImage, alt: "Students working on innovation projects", category: "Workshop" },
    { src: solarImage, alt: "Solar panel project development", category: "Projects" },
    { src: roboticsImage, alt: "Advanced robotics engineering", category: "Projects" },
    { src: ecoImage, alt: "Environmental conservation project", category: "Projects" },
    { src: heroImage, alt: "Team collaboration session", category: "Collaboration" },
    { src: solarImage, alt: "STEM education workshop", category: "Workshop" },
  ];

  return (
    <section id="gallery" className="section-padding bg-muted/30">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Innovation <span className="gradient-text">Gallery</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Capturing moments of creativity, collaboration, and discovery
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl cursor-pointer aspect-square"
              onClick={() => setSelectedImage(image.src)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium mb-2">
                    {image.category}
                  </span>
                  <p className="text-white text-sm">{image.alt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-white text-4xl hover:text-primary transition-colors"
              onClick={() => setSelectedImage(null)}
              aria-label="Close gallery"
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Gallery view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default Gallery;
