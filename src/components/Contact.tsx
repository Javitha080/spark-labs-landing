import { MapPin, Mail, Phone, Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you as soon as possible.",
    });
  };

  return (
    <section id="contact" className="section-padding bg-muted/30">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions? We'd love to hear from you
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="glass-card p-8 rounded-2xl h-fit">
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Location</h4>
                    <p className="text-muted-foreground">
                      Dharmapala Vidyalaya<br />
                      Pannipitiya, Sri Lanka
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-muted-foreground">innovators@dharmapala.edu.lk</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-muted-foreground">+94 XX XXX XXXX</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border">
                <h4 className="font-semibold mb-4">Follow Us</h4>
                <div className="flex gap-3">
                  <Button variant="outline" size="icon" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Facebook className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Instagram className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Youtube className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Twitter className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

          {/* Map */}
          <div className="glass-card p-4 rounded-2xl h-full min-h-[500px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.286227738641!2d79.96068631477495!3d6.857182595018891!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2507e8c3f3c57%3A0x8c8e8c8c8c8c8c8d!2sDharmapala%20Vidyalaya!5e0!3m2!1sen!2slk!4v1234567890123!5m2!1sen!2slk"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default Contact;
