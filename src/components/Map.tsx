interface MapProps {
  locations?: Array<{
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
}

const Map = ({ locations }: MapProps) => {
  // Using Google Maps Embed API for Dharmapala Vidyalaya Pannipitiya
  const embedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.575157280254!2d79.94340491744384!3d6.819732499999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2507a3b1907e3%3A0x9e4e9c1312593ece!2sDharmapala%20Vidyalaya!5e0!3m2!1sen!2sus!4v1697654321098!5m2!1sen!2sus";

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-lg">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Location Map"
        className="absolute inset-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
};

export default Map;
