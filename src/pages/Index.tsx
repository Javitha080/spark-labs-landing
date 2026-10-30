import { useEffect, useMemo, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Hero from "@/components/home/Hero";
import HorizontalShowcase from "@/components/home/HorizontalShowcase";
import FeatureGrid from "@/components/home/FeatureGrid";
import StatsSection from "@/components/home/StatsSection";
import Faq, { faqItems } from "@/components/home/FAQ";
import {
  FadeInOnScroll,
  SectionDivider,
} from "@/components/animation/ScrollAnimations";
import { organizationJsonLd, webSiteJsonLd, faqPageJsonLd } from "@/lib/structuredData";
import { scrollToTarget, HEADER_OFFSET } from "@/lib/scroll";
import PageTransition from "@/components/animation/PageTransition";
import LazySection from "@/components/loading/LazySection";
import BootScreen from "@/components/loading/BootScreen";
import { BOOT_EVENT } from "@/lib/boot";

// Lazy factories - each section loads independently when approaching viewport
const loadTimeline = () => import("@/components/home/AchievementsTimeline");
const loadDiorama = () => import("@/components/home/DioramaShowcase");
const loadProjects = () => import("@/components/Projects");
const loadLeadership = () => import("@/components/home/LandingLeadership");
const loadTeachers = () => import("@/components/Teachers");
const loadEvents = () => import("@/components/Events");
const loadGallery = () => import("@/components/Gallery");
const loadPartners = () => import("@/components/home/Partners");
const loadJoinUs = () => import("@/components/JoinUs");
const loadContact = () => import("@/components/Contact");
import Footer from "@/components/Footer";
const InnovationChatbot = lazy(() => import("@/components/InnovationChatbot"));

const Index = () => {
  const location = useLocation();

  // Structured data for homepage (Organization + WebSite + FAQPage)
  const structuredData = useMemo(() => [
    organizationJsonLd(),
    webSiteJsonLd(),
    faqPageJsonLd(faqItems),
  ], []);

  // Handle hash navigation from other pages (e.g., /blog -> /#contact).
  // On a fresh first visit the boot screen pauses Lenis for a moment, so the
  // scroll is deferred and additionally triggered by the booted event rather
  // than racing the splash. Landing sections arrive with lazy chunks and the
  // pinned showcase changes document height as it initializes, so the flow
  // waits out three things before moving: the target existing, its absolute
  // position holding still across checks, and then a landing verification
  // that snaps back if late images shifted the stop point. If the user
  // starts scrolling themselves first, the auto-scroll stands down.
  // react-doctor-disable no-mutable-in-deps
  useEffect(() => {
    if (!location.hash) return;
    const elementId = location.hash.replace("#", "");
    const wantTop = -HEADER_OFFSET;
    let done = false;
    let userTookOver = false;
    let elementTries = 0;
    let stableTries = 0;
    let verifyTries = 0;
    let prevAbs: number | null = null;
    let prevDocH: number | null = null;
    let lastMoveAt = 0;
    let prevGap: number | null = null;
    let verifyId: number | undefined;
    let stepId: number | undefined;

    const verifyLanding = () => {
      const snapLoop = () => {
        if (done) return;
        const gap = document.getElementById(elementId)?.getBoundingClientRect().top;
        if (typeof gap !== "number") return;
        if (Math.abs(gap - wantTop) <= 24) {
          prevGap = null;
          return;
        }
        if (prevGap === null) {
          prevGap = gap;
        } else if (Math.abs(gap - prevGap) < 4) {
          // Layout stable and still misaligned: snap to the parked target.
          scrollToTarget(elementId, { immediate: true });
          prevGap = null;
        } else {
          prevGap = gap;
        }
        verifyTries += 1;
        if (verifyTries < 12) verifyId = window.setTimeout(snapLoop, 350);
      };
      verifyId = window.setTimeout(snapLoop, 350);
    };

    const beginScroll = () => {
      done = true;
      // Goes through lib/scroll so Lenis's easing drives the animation and
      // the stop lands below the fixed header. It returns how long the
      // travel takes so the landing check only starts once we have arrived.
      const travelMs = scrollToTarget(elementId);
      // scrollend re-runs the check on engines that have it; the duration
      // scheduled check covers the rest.
      window.addEventListener("scrollend", verifyLanding, { once: true });
      verifyId = window.setTimeout(verifyLanding, travelMs + 320);
    };

    const step = () => {
      if (done || userTookOver) return;
      // The boot event and the immediate kick can both land here; cancelling
      // the pending chain keeps one schedule alive instead of two racing
      // cadences that burn through the caps at double speed.
      window.clearTimeout(stepId);
      const element = document.getElementById(elementId);
      if (!element) {
        elementTries += 1;
        if (elementTries < 80) stepId = window.setTimeout(step, 150);
        return;
      }
      // The sections that sit between the home hero and the deep target
      // mount lazily as they approach the viewport, and every mounting
      // section physically moves the document (the pinned showcase is one
      // of them). Only move once the target's absolute position and the
      // document height have both held still for a rolling quiet window;
      // after the force cap the scroll goes anyway and the landing check
      // cleans up anything that shifted late.
      const abs = Math.round(element.getBoundingClientRect().top + window.scrollY);
      const docH = document.documentElement.scrollHeight;
      const now = performance.now();
      const changed =
        prevAbs !== null &&
        (Math.abs(abs - prevAbs) >= 6 || Math.abs(docH - prevDocH) >= 24);
      if (changed || prevAbs === null) lastMoveAt = now;
      prevAbs = abs;
      prevDocH = docH;
      if (now - lastMoveAt >= 1800) {
        beginScroll();
        return;
      }
      stableTries += 1;
      // After the force cap the scroll goes anyway and the landing check
      // cleans up anything that shifted late.
      if (stableTries < 100) {
        stepId = window.setTimeout(step, 300);
      } else {
        beginScroll();
      }
    };

    // The immediate kick handles targets that are already in place (back or
    // forward navigation over a settled document); the BOOT_EVENT fallback
    // covers slower first paints (BootScreen skip path dispatches before
    // this parent effect has attached, which is why boot.ts defers it).
    window.addEventListener(BOOT_EVENT, step, { once: true });
    stepId = window.setTimeout(step, 150);

    // Stand down if the user starts scrolling themselves before we move.
    const takeOver = () => {
      userTookOver = true;
    };
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    window.addEventListener("keydown", takeOver);

    return () => {
      done = true;
      window.clearTimeout(stepId);
      window.clearTimeout(verifyId);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("keydown", takeOver);
      window.removeEventListener("scrollend", verifyLanding);
      window.removeEventListener(BOOT_EVENT, step);
    };
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
        <BootScreen />
        <Header />
        <main>
          <Hero />
          <HorizontalShowcase />
          <LazySection factory={loadDiorama} skeletonHeight="420px" rootMargin="600px">
            {(Diorama) => <Diorama />}
          </LazySection>
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
            id="projects"
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
            id="team"
            factory={loadLeadership}
            priority
            skeletonHeight="400px"
          >
            {(Leadership) => (
              <FadeInOnScroll>
                <Leadership />
              </FadeInOnScroll>
            )}
          </LazySection>

          <SectionDivider />

          <LazySection
            id="teachers"
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
            id="events"
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
            id="gallery"
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
            <Faq />
          </FadeInOnScroll>

          <LazySection
            id="join"
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
            id="contact"
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
        {/* Footer needs to be in DOM (not lazy) for GSAP ScrollTrigger pinning */}
        <div id="footer-scroll-wrapper">
          <Footer />
        </div>
        <Suspense fallback={null}>
          <InnovationChatbot />
        </Suspense>
      </div>
    </PageTransition>
  );
};

export default Index;