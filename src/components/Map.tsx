import { Map as MapCanvas, MapMarker, MarkerContent, MapControls } from "@/components/ui/map";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Navigation, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MapProps {
  locations?: Array<{
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
}

const Map = ({ locations }: MapProps) => {
  const [showOverlay, setShowOverlay] = useState(true);

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
    <div className="relative w-full h-[450px] md:h-[600px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-primary/20 bg-muted/5 group">
      <MapCanvas
        key="main-map"
        center={[defaultLocation.lng, defaultLocation.lat]}
        zoom={15}
        className="w-full h-full"
        attributionControl={false}
      >
        <MapControls
          showZoom={true}
          showLocate={true}
          showFullscreen={true}
          position="bottom-right"
          className="mb-8 mr-2"
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
                  <MapPin className="size-5 text-white" />

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
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="absolute top-6 left-6 z-20 w-[calc(100%-3rem)] sm:w-80"
          >
            <div className="glass-card p-6 rounded-[2rem] border-white/20 backdrop-blur-2xl shadow-3xl bg-background/60">
              <div className="flex justify-between items-start mb-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Navigation className="size-6" />
                </div>
                <button
                  onClick={() => setShowOverlay(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <h3 className="text-xl font-black mb-2 gradient-text">Spark Labs HQ</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Located at {defaultLocation.title}, {defaultLocation.description}
              </p>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12 gap-2"
                >
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    Get Directions <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open Overlay Re-trigger (only show if hidden) */}
      {!showOverlay && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowOverlay(true)}
          className="absolute top-6 left-6 z-20 size-12 rounded-2xl glass-card bg-primary text-white flex items-center justify-center shadow-xl border-white/20 hover:scale-105 transition-transform"
        >
          <Navigation className="size-6" />
        </motion.button>
      )}
    </div>
  );
};

export default Map;

