import { useEffect, useMemo, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Hero from "@/components/home/Hero";
import FeatureGrid from "@/components/home/FeatureGrid";
import StatsSection from "@/components/home/StatsSection";
import FAQ, { faqItems } from "@/components/home/FAQ";
import {
  FadeInOnScroll,
  SectionDivider,
} from "@/components/animation/ScrollAnimations";
import { organizationJsonLd, webSiteJsonLd, faqPageJsonLd } from "@/lib/structuredData";

import PageTransition from "@/components/animation/PageTransition";

// Lazy load below-the-fold components to prioritize "above the fold" render speed
const AchievementsTimeline = lazy(() => import("@/components/home/AchievementsTimeline"));
const Projects = lazy(() => import("@/components/Projects"));
const Team = lazy(() => import("@/components/Team"));
const Teachers = lazy(() => import("@/components/Teachers"));
const Events = lazy(() => import("@/components/Events"));
const Gallery = lazy(() => import("@/components/Gallery"));
const Testimonials = lazy(() => import("@/components/home/Testimonials"));
const Partners = lazy(() => import("@/components/home/Partners"));
const JoinUs = lazy(() => import("@/components/JoinUs"));
const Contact = lazy(() => import("@/components/Contact"));
const Footer = lazy(() => import("@/components/Footer"));
const InnovationChatbot = lazy(() => import("@/components/InnovationChatbot"));

const Index = () => {
  const location = useLocation();

  // Structured data for homepage (Organization + WebSite + FAQPage)
  const structuredData = useMemo(() => [
    organizationJsonLd(),
    webSiteJsonLd(),
    faqPageJsonLd(faqItems),
  ], []);

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
    <PageTransition>
      <div className="min-h-screen bg-background">
      <SEOHead
        title="Young Innovators Club | STEM & Robotics at DVP"
        description="Join the Young Innovators Club (YICDVP) at Dharmapala Vidyalaya. We empower students through hands-on STEM, robotics, IoT, and solar energy projects."
        path="/"
        structuredData={structuredData}
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

        {/* Wrap all below-the-fold content in Suspense to prevent blocking the initial Hero render */}
        <Suspense fallback={<div className="min-h-[100vh] w-full" />}>
          <FadeInOnScroll>
            <AchievementsTimeline />
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

        <SectionDivider />

        <FadeInOnScroll>
          <Testimonials />
        </FadeInOnScroll>

        <FadeInOnScroll>
          <Partners />
        </FadeInOnScroll>

        <SectionDivider />

        <FadeInOnScroll>
          <FAQ />
        </FadeInOnScroll>

        <FadeInOnScroll>
          <JoinUs />
        </FadeInOnScroll>

        <FadeInOnScroll>
          <Contact />
        </FadeInOnScroll>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
        <InnovationChatbot />
      </Suspense>
    </div>
    </PageTransition>
  );
};

export default Index;