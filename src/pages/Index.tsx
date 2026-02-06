import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Team from "@/components/Team";
import Projects from "@/components/Projects";
import Events from "@/components/Events";
import Gallery from "@/components/Gallery";
import JoinUs from "@/components/JoinUs";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import InnovationChatbot from "@/components/InnovationChatbot";
import Teachers from "@/components/Teachers";

const Index = () => {
  const location = useLocation();

  // Handle hash navigation from other pages (e.g., /blog -> /#contact)
  useEffect(() => {
    if (location.hash) {
      const elementId = location.hash.replace("#", "");
      // Small delay to ensure the page is fully rendered
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <About />
        <Projects />
        <Team />
        <Teachers />
        <Events />
        <Gallery />
        <JoinUs />
        <Contact />
      </main>
      <Footer />
      <InnovationChatbot />
    </div>
  );
};

export default Index;

