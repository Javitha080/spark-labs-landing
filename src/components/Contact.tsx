import { Mail, MapPin, Phone, Send, User, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// Lazy-load Map component (MapLibre GL is ~276KB gzipped)
const Map = lazy(() => import("./Map"));

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  const [content, setContent] = useState({
    heading_main: "get in touch",
    heading_sub: "have questions? we'd love to hear from you. send us a message!",
    card_1_title: "Visit Us",
    card_1_detail_1: "Dharmapala Vidyalaya",
    card_1_detail_2: "Silva Place, Pannipitiya 10230",
    card_2_title: "Email Us",
    card_2_detail_1: "innovators@dharmapala.edu.lk",
    card_2_detail_2: "General Inquiries",
    card_3_title: "Call Us",
    card_3_detail_1: "+94 XX XXX XXXX",
    card_3_detail_2: "Mon - Fri, 9AM - 4PM",
  });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from("content_blocks")
          .select("*")
          .eq("page_name", "landing_page")
          .eq("section_name", "contact");

        if (error) {
          console.error("Failed to fetch contact content:", error);
          return;
        }

        if (data?.length > 0) {
          setContent(prev => {
            const newContent = { ...prev };
            data.forEach(block => {
              if (block.block_key in newContent) {
                (newContent as Record<string, string>)[block.block_key] = block.content_value ?? "";
              }
            });
            return newContent;
          });
        }
      } catch (err) {
        console.error("Unexpected error fetching contact content:", err);
      }
    };
    fetchContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-message', {
        body: formData
      });

      if (error) {
        console.error('Contact form error:', error);
        toast({
          title: "Message Failed",
          description: "Please try again later.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      });
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      const err = error as Error;
      console.error('Submission error:', err);
      toast({
        title: "Message Failed",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: content?.card_1_title ?? "Visit Us",
      details: [content?.card_1_detail_1 ?? "", content?.card_1_detail_2 ?? ""],
      gradient: "from-primary to-primary-glow"
    },
    {
      icon: Mail,
      title: content?.card_2_title ?? "Email Us",
      details: [content?.card_2_detail_1 ?? "", content?.card_2_detail_2 ?? ""],
      gradient: "from-secondary to-secondary-glow"
    },
    {
      icon: Phone,
      title: content?.card_3_title ?? "Call Us",
      details: [content?.card_3_detail_1 ?? "", content?.card_3_detail_2 ?? ""],
      gradient: "from-accent to-accent-glow"
    }
  ];

  interface ContactInfo {
    icon: React.ElementType;
    title: string;
    details: string[];
    gradient: string;
  }

  const ContactInfoCard = ({ info, index }: { info: ContactInfo; index: number }) => {
    const { ref, isVisible } = useScrollAnimation({
      threshold: 0.3,
      triggerOnce: true,
    });

    return (
      <div
        ref={ref}
        className={
          `glass-card p-6 md:p-8 rounded-2xl text-center group
          transition-all duration-500 hover:scale-105 hover:shadow-xl
          ${isVisible ? 'animate-fade-up' : 'opacity-0'}`
        }
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${info.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
          <info.icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{info.title}</h3>
        {info.details.map((detail: string, i: number) => (
          <p key={i} className={`${i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground text-sm'} break-all`}>
            {detail}
          </p>
        ))}
      </div>
    );
  };

  const clubLocation = {
    lat: 6.845798,
    lng: 79.946565,
    title: "Dharmapala Vidyalaya",
    description: "Silva Place, Pannipitiya 10230, Sri Lanka"
  };

  return (
    <section id="contact" className="section-padding relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-5xl md:text-7xl font-black lowercase mb-4 tracking-tighter">
              {content.heading_main.includes(' ') ? (
                <>
                  {content.heading_main.substring(0, content.heading_main.lastIndexOf(' '))} <GradientTextReveal gradient="from-primary via-secondary to-accent">{content.heading_main.substring(content.heading_main.lastIndexOf(' ') + 1)}</GradientTextReveal>
                </>
              ) : (
                <GradientTextReveal gradient="from-primary via-secondary to-accent">{content.heading_main}</GradientTextReveal>
              )}
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
              {content?.heading_sub ?? "have questions? we'd love to hear from you."}
            </p>
          </TextReveal>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {contactInfo.map((info, index) => (
            <ContactInfoCard key={index} info={info} index={index} />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Map */}
          <TextReveal animation="slide-right">
            <div className="h-full min-h-[450px] md:min-h-[600px] rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-primary/10">
              <Suspense fallback={<div className="w-full h-full min-h-[450px] md:min-h-[600px] bg-muted/30 animate-pulse rounded-[2.5rem]" />}>
                <Map locations={[clubLocation]} />
              </Suspense>
            </div>
          </TextReveal>

          {/* Contact Form */}
          <TextReveal animation="slide-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-card p-1 md:p-2 rounded-[2.5rem] relative overflow-hidden group"
            >
              <div className="relative z-10 bg-card/50 backdrop-blur-2xl p-8 md:p-10 rounded-[2.2rem] border border-border/50">
                {/* Decorative glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Send className="size-5" />
                    </div>
                    <h3 className="text-3xl md:text-4xl font-black lowercase gradient-text tracking-tight">send us a message</h3>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      initial="hidden"
                      whileInView="visible"
                      transition={{ delay: 0.1 }}
                      className="group/input"
                    >
                      <label htmlFor="name" className="block text-sm font-bold text-muted-foreground mb-2 ml-1 uppercase tracking-widest">Name</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                          <User className="size-5" />
                        </div>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="What should we call you?"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 focus:border-primary/50 focus:bg-muted/80 transition-all text-base ring-offset-transparent focus-visible:ring-primary/20"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      initial="hidden"
                      whileInView="visible"
                      transition={{ delay: 0.2 }}
                      className="group/input"
                    >
                      <label htmlFor="email" className="block text-sm font-bold text-muted-foreground mb-2 ml-1 uppercase tracking-widest">Email Address</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                          <Mail className="size-5" />
                        </div>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="where can we reach you?"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 focus:border-primary/50 focus:bg-muted/80 transition-all text-base ring-offset-transparent focus-visible:ring-primary/20"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      initial="hidden"
                      whileInView="visible"
                      transition={{ delay: 0.3 }}
                      className="group/input"
                    >
                      <label htmlFor="message" className="block text-sm font-bold text-muted-foreground mb-2 ml-1 uppercase tracking-widest">Your Message</label>
                      <div className="relative">
                        <div className="absolute left-4 top-6 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                          <MessageSquare className="size-5" />
                        </div>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Write your thoughts here..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={5}
                          className="pl-12 pt-5 rounded-[1.5rem] bg-muted/50 border-border/50 focus:border-primary/50 focus:bg-muted/80 transition-all text-base resize-none ring-offset-transparent focus-visible:ring-primary/20"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      initial="hidden"
                      whileInView="visible"
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-16 rounded-[1.5rem] text-lg font-bold transition-all relative overflow-hidden bg-gradient-to-r from-primary to-secondary hover:shadow-[0_0_30px_rgba(var(--primary),0.3)] group-active:scale-95"
                      >
                        <AnimatePresence mode="wait">
                          {isSubmitting ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Loader2 className="size-5 animate-spin" />
                              Sending...
                            </motion.div>
                          ) : (
                            <motion.div
                              key="normal"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <span>Shoot Message</span>
                              <Send className="size-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </motion.div>

                    <p className="text-center text-xs text-muted-foreground mt-4">
                      By sending, you agree to our <a href="/privacy-policy" className="underline hover:text-primary transition-colors">Privacy Policy</a>
                    </p>
                  </form>
                </div>
              </div>
            </motion.div>
          </TextReveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
