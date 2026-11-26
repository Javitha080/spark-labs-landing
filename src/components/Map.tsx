import { Map as MapCanvas, MapMarker, MarkerContent, MapControls } from "@/components/common/map";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Navigation, MapPin, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { prefersReducedMotion } from "@/lib/motion";

interface MapProps {
  locations?: Array<{
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
  className?: string;
}

const Map = ({ locations, className }: MapProps) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const isReduced = prefersReducedMotion();

  // Coordinates for Dharmapala Vidyalaya Pannipitiya
  const defaultLocation = {
    lat: 6.845798,
    lng: 79.946565,
    title: "Dharmapala Vidyalaya",
    description: "Silva Place, Pannipitiya 10230, Sri Lanka"
  };

  const displayLocations = locations?.length ? locations : [defaultLocation];

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${defaultLocation.lat},${defaultLocation.lng}`;

  return (
    <div className={`relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-primary/20 bg-muted/5 group ${className || 'h-[450px] md:h-[600px]'}`}>
      <MapCanvas
        key="main-map"
        center={[defaultLocation.lng, defaultLocation.lat]}
        zoom={15}
        className="size-full"
        attributionControl={false}
        scrollZoom={false}
        cooperativeGestures={true}
      >
        <MapControls
          showZoom={true}
          showLocate={true}
          showFullscreen={true}
          position="bottom-right"
          className="mb-2 mr-2"
        />

        {displayLocations.map((loc, index) => (
          <MapMarker
            key={`${index}-${loc.lat}-${loc.lng}`}
            longitude={loc.lng}
            latitude={loc.lat}
            onClick={() => setShowOverlay(true)}
          >
            <MarkerContent>
              <div className="group relative">
                {/* Visual marker */}
                <div className="size-10 bg-primary rounded-full border-4 border-white shadow-[0_0_20px_rgba(var(--primary),0.4)] flex items-center justify-center transition-all hover:scale-125 cursor-pointer">
                  <MapPin className="size-5 text-primary-foreground" aria-hidden="true" />

                  {/* Internal ping effect */}
                  <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                </div>

                {/* Outer halo */}
                <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
      </MapCanvas>

      {/* Info Overlay Panel - Desktop Optimized */}
      <AnimatePresence>
        {showOverlay && (
          <m.div
            initial={isReduced ? false : { opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={isReduced ? { opacity: 0 } : { opacity: 0, x: -20, scale: 0.95 }}
            transition={isReduced ? { duration: 0 } : undefined}
            className="absolute top-3 left-3 z-20 w-[calc(100%-5rem)] sm:top-6 sm:left-6 sm:w-80"
          >
            <div className="events-blur-card glass-card p-4 sm:p-6 rounded-[2rem] border-border/50 backdrop-blur-2xl shadow-3xl bg-card/60">
              <div className="flex justify-between items-start mb-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Navigation className="size-6" aria-hidden="true" />
                </div>
                <button type="button"
                  onClick={() => setShowOverlay(false)}
                  className="size-11 -mt-1 -mr-1 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close location details"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <h3 className="text-xl font-black mb-2 gradient-text">YICDVP</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Located at {defaultLocation.title}, {defaultLocation.description}
              </p>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 gap-2"
                >
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    Get Directions <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Open Overlay Re-trigger (only show if hidden) */}
      {!showOverlay && (
        <m.button
          type="button"
          aria-label="Show location details"
          initial={isReduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={isReduced ? { duration: 0 } : undefined}
          onClick={() => setShowOverlay(true)}
          className="absolute top-3 left-3 sm:top-6 sm:left-6 z-20 size-12 rounded-2xl glass-card bg-primary text-primary-foreground flex items-center justify-center shadow-xl border-border/50 hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Navigation className="size-6" aria-hidden="true" />
        </m.button>
      )}
    </div>
  );
};

export default Map;

