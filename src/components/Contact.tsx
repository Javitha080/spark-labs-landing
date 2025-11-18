import { MapPin, Mail, Phone } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Contact = () => {
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section id="contact" ref={ref} className="section-padding bg-background">
      <div className="container-custom">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">Get in <span className="text-primary">Touch</span></h2>
          <p className="text-xl text-muted-foreground font-light">Have questions? We'd love to hear from you</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="border border-border/50 bg-card p-8 rounded-3xl text-center">
            <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Location</h3>
            <p className="text-muted-foreground">Dharmapala Vidyalaya, Pannipitiya</p>
          </div>
          <div className="border border-border/50 bg-card p-8 rounded-3xl text-center">
            <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Email</h3>
            <p className="text-muted-foreground">innovators@dharmapala.edu.lk</p>
          </div>
          <div className="border border-border/50 bg-card p-8 rounded-3xl text-center">
            <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Phone</h3>
            <p className="text-muted-foreground">+94 XX XXX XXXX</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
