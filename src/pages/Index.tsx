import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Hero from "@/components/home/Hero";
import Team from "@/components/Team";
import Projects from "@/components/Projects";
import Events from "@/components/Events";
import Gallery from "@/components/Gallery";
import JoinUs from "@/components/JoinUs";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import InnovationChatbot from "@/components/InnovationChatbot";
import Teachers from "@/components/Teachers";
import FeatureGrid from "@/components/home/FeatureGrid";
import StatsSection from "@/components/home/StatsSection";
import {
  FadeInOnScroll,
  SectionDivider,
} from "@/components/animation/ScrollAnimations";

const Index = () => {
  const location = useLocation();

  // Handle hash navigation from other pages (e.g., /blog -> /#contact)
  useEffect(() => {
    if (location.hash) {
      const elementId = location.hash.replace("#", "");
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
      <SEOHead
        title="Young Innovators Club | STEM & Robotics at DVP"
        description="Join the Young Innovators Club (YICDVP) at Dharmapala Vidyalaya. We empower students through hands-on STEM, robotics, IoT, and solar energy projects."
        path="/"
      />
      <Header />
      <main>
        <Hero />

        <FadeInOnScroll>
          <FeatureGrid />
        </FadeInOnScroll>

        <SectionDivider />

        <FadeInOnScroll>
          <StatsSection />
        </FadeInOnScroll>

        <SectionDivider />

        <FadeInOnScroll>
          <Projects />
        </FadeInOnScroll>

        <SectionDivider />

        <FadeInOnScroll>
          <Team />
        </FadeInOnScroll>

        <FadeInOnScroll>
          <Teachers />
        </FadeInOnScroll>

        <SectionDivider />

        <FadeInOnScroll>
          <Events />
        </FadeInOnScroll>

        <SectionDivider />

        <FadeInOnScroll>
          <Gallery />
        </FadeInOnScroll>

        <FadeInOnScroll>
          <JoinUs />
        </FadeInOnScroll>

        <FadeInOnScroll>
          <Contact />
        </FadeInOnScroll>
      </main>
      <Footer />
      <InnovationChatbot />
    </div>
  );
};

export default Index;