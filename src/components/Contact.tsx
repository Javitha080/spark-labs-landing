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
            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Map View</p>
                <p className="text-sm text-muted-foreground">Dharmapala Vidyalaya, Pannipitiya</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Contact;
