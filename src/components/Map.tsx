import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  locations: Array<{
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
}

const Map = ({ locations }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map - Note: You need to add your Mapbox token as a secret
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
    
    if (!mapboxgl.accessToken) {
      console.warn('Mapbox token not configured. Please add VITE_MAPBOX_TOKEN to your environment.');
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: locations.length > 0 ? [locations[0].lng, locations[0].lat] : [79.8612, 6.9271],
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add markers for each location
    locations.forEach((location) => {
      if (!map.current) return;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2">
          <h3 class="font-bold text-sm mb-1">${location.title}</h3>
          ${location.description ? `<p class="text-xs text-muted-foreground">${location.description}</p>` : ''}
        </div>`
      );

      new mapboxgl.Marker({ color: '#8B5CF6' })
        .setLngLat([location.lng, location.lat])
        .setPopup(popup)
        .addTo(map.current);
    });

    // Fit map to show all markers
    if (locations.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((loc) => bounds.extend([loc.lng, loc.lat]));
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [locations]);

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;
