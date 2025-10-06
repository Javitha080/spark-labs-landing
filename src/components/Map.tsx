interface MapProps {
  locations?: Array<{
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
}

const Map = ({ locations }: MapProps) => {
  // Using Google Maps Embed API with the specific location
  // https://maps.app.goo.gl/Meaaf1xXciaMThRc6
  const embedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.798947267892!2d79.85961347475845!3d6.914711993083945!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25bcf72ab8891%3A0x8b25b1b1b1b1b1b1!2sSri%20Lanka!5e0!3m2!1sen!2slk!4v1234567890123!5m2!1sen!2slk";

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
      />
    </div>
  );
};

export default Map;
