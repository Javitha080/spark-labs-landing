import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-background border-t border-border/50 py-12">
      <div className="container-custom">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold mb-4 text-foreground">Stay <span className="text-primary">Connected</span></h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">Join our innovation community and receive updates about workshops, events, and achievements</p>
        </div>
        <div className="text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Young Innovators Club. All rights reserved.</p>
        </div>
      </div>
      <Button variant="outline" size="icon" className="fixed bottom-8 right-8 rounded-full" onClick={scrollToTop}>
        <ArrowUp className="w-5 h-5" />
      </Button>
    </footer>
  );
};

export default Footer;
