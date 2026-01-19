import { Map as MapCanvas, MapMarker, MarkerContent, MarkerPopup, MapPopup } from "@/components/ui/map";
import { useState } from "react";

interface MapProps {
  locations?: Array<{
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
}

const Map = ({ locations }: MapProps) => {
  const [showPopup, setShowPopup] = useState(true);

  // Coordinates for Dharmapala Vidyalaya Pannipitiya
  const defaultLocation = {
    lat: 6.845798,
    lng: 79.946565,
    title: "Dharmapala Vidyalaya",
    description: "Silva Place, Pannipitiya 10230, Sri Lanka"
  };

  const displayLocations = locations?.length ? locations : [defaultLocation];

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-2xl border border-primary/20 bg-muted/5">
      <MapCanvas
        key="main-map"
        center={[defaultLocation.lng, defaultLocation.lat]}
        zoom={15}
        className="w-full h-full"
        attributionControl={false}
      >
        {showPopup && (
          <MapPopup
            longitude={defaultLocation.lng}
            latitude={defaultLocation.lat}
            onClose={() => setShowPopup(false)}
            closeButton={false}
            className="min-w-[200px] select-none pointer-events-none"
          >
            <div className="p-1">
              <h3 className="font-bold text-base text-primary mb-1">{defaultLocation.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {defaultLocation.description}
              </p>
            </div>
          </MapPopup>
        )}

        {displayLocations.map((loc, index) => (
          <MapMarker
            key={`${index}-${loc.lat}-${loc.lng}`}
            longitude={loc.lng}
            latitude={loc.lat}
            onClick={() => setShowPopup(true)}
          >
            <MarkerContent>
              <div className="group relative">
                <div className="size-6 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all hover:scale-125 hover:rotate-12 cursor-pointer">
                  <div className="size-2 bg-white rounded-full animate-ping" />
                </div>
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
      </MapCanvas>
    </div>
  );
};

export default Map;
