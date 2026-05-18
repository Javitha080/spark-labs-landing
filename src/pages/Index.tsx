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
import LazySection from "@/components/loading/LazySection";

// Lazy factories — each section loads independently when approaching viewport
const loadTimeline = () => import("@/components/home/AchievementsTimeline");
const loadProjects = () => import("@/components/Projects");
const loadTeam = () => import("@/components/Team");
const loadTeachers = () => import("@/components/Teachers");
const loadEvents = () => import("@/components/Events");
const loadGallery = () => import("@/components/Gallery");
const loadPartners = () => import("@/components/home/Partners");
const loadJoinUs = () => import("@/components/JoinUs");
const loadContact = () => import("@/components/Contact");
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

        {/* Each section loads independently when approaching viewport.
            Projects & Team are priority=true (prefetch on idle after Hero).
            This fixes the slow loading issue: sections no longer block each other. */}

        <LazySection
          factory={loadTimeline}
          skeletonHeight="600px"
          rootMargin="400px"
        >
          {(Timeline) => (
            <FadeInOnScroll>
              <Timeline />
            </FadeInOnScroll>
          )}
        </LazySection>

        <SectionDivider />

        <LazySection
          factory={loadProjects}
          priority
          skeletonHeight="500px"
        >
          {(Projects) => (
            <FadeInOnScroll>
              <Projects />
            </FadeInOnScroll>
          )}
        </LazySection>

        <SectionDivider />

        <LazySection
          factory={loadTeam}
          priority
          skeletonHeight="500px"
        >
          {(Team) => (
            <FadeInOnScroll>
              <Team />
            </FadeInOnScroll>
          )}
        </LazySection>

        <LazySection
          factory={loadTeachers}
          skeletonHeight="400px"
        >
          {(Teachers) => (
            <FadeInOnScroll>
              <Teachers />
            </FadeInOnScroll>
          )}
        </LazySection>

        <SectionDivider />

        <LazySection
          factory={loadEvents}
          skeletonHeight="500px"
        >
          {(Events) => (
            <FadeInOnScroll>
              <Events />
            </FadeInOnScroll>
          )}
        </LazySection>

        <SectionDivider />

        <LazySection
          factory={loadGallery}
          skeletonHeight="500px"
        >
          {(Gallery) => (
            <FadeInOnScroll>
              <Gallery />
            </FadeInOnScroll>
          )}
        </LazySection>



        <LazySection
          factory={loadPartners}
          skeletonHeight="300px"
        >
          {(Partners) => (
            <FadeInOnScroll>
              <Partners />
            </FadeInOnScroll>
          )}
        </LazySection>

        <SectionDivider />

        <FadeInOnScroll>
          <FAQ />
        </FadeInOnScroll>

        <LazySection
          factory={loadJoinUs}
          skeletonHeight="500px"
          rootMargin="500px"
        >
          {(JoinUs) => (
            <FadeInOnScroll>
              <JoinUs />
            </FadeInOnScroll>
          )}
        </LazySection>

        <LazySection
          factory={loadContact}
          skeletonHeight="400px"
        >
          {(Contact) => (
            <FadeInOnScroll>
              <Contact />
            </FadeInOnScroll>
          )}
        </LazySection>
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