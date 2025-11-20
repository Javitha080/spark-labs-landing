import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState } from "react";
import Map from "./Map";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent! ✅",
      description: "We'll get back to you as soon as possible.",
    });
    setFormData({ name: "", email: "", message: "" });
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Visit Us",
      details: ["Dharmapala Vidyalaya", "Pannipitiya, Sri Lanka"],
      gradient: "from-primary to-primary/70"
    },
    {
      icon: Mail,
      title: "Email Us",
      details: ["innovators@dharmapala.edu.lk", "General Inquiries"],
      gradient: "from-secondary to-secondary/70"
    },
    {
      icon: Phone,
      title: "Call Us",
      details: ["+94 XX XXX XXXX", "Mon - Fri, 9AM - 4PM"],
      gradient: "from-accent to-accent/70"
    }
  ];

  const clubLocation = {
    lat: 6.8507,
    lng: 79.9627,
    title: "Dharmapala Vidyalaya",
    description: "Pannipitiya, Sri Lanka"
  };

  return (
    <section id="contact" className="section-padding relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Get in <GradientTextReveal gradient="from-primary via-secondary to-accent">Touch</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message!
            </p>
          </TextReveal>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {contactInfo.map((info, index) => {
            const { ref, isVisible } = useScrollAnimation({
              threshold: 0.3,
              triggerOnce: true,
            });

            return (
              <div
                key={index}
                ref={ref}
                className={`
                  glass-card p-6 md:p-8 rounded-2xl text-center group
                  transition-all duration-500 hover:scale-105 hover:shadow-xl
                  ${isVisible ? 'animate-fade-up' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${info.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                  <info.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{info.title}</h3>
                {info.details.map((detail, i) => (
                  <p key={i} className={`${i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground text-sm'}`}>
                    {detail}
                  </p>
                ))}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Form */}
          <TextReveal animation="slide-right">
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6">Send us a Message</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Message *</label>
                    <Textarea
                      placeholder="Tell us what you're thinking..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={6}
                      className="rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 rounded-xl py-6 shadow-lg hover:shadow-primary/50 transition-all group"
                  >
                    Send Message
                    <Send className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </Button>
                </form>
              </div>
            </div>
          </TextReveal>

          {/* Map */}
          <TextReveal animation="slide-left">
            <div className="h-full min-h-[400px] rounded-3xl overflow-hidden shadow-2xl">
              <Map locations={[clubLocation]} />
            </div>
          </TextReveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
