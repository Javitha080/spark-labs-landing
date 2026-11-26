import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { GamificationProvider } from "@/context/GamificationContext";
import { StudentAuthProvider } from "@/context/StudentAuthContext";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import RouteErrorBoundary from "@/components/common/RouteErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollToTop from "@/components/common/ScrollToTop";
import SkipToContent from "@/components/common/SkipToContent";
import RouteAnnouncer from "@/components/common/RouteAnnouncer";
import RouteSkeletons from "@/components/common/RouteSkeletons";
import { Loading } from "@/components/common/loading";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCMSLandingPath } from "@/lib/rbac";
import { WifiOff } from "lucide-react";
import { LazyMotion } from "framer-motion";
import SmoothScroll from "@/components/SmoothScroll";
import LenisModalBridge from "@/components/LenisModalBridge";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";

const loadFeatures = () => import("framer-motion").then((res) => res.domMax);

const CommandPalette = lazy(() => import("@/components/common/CommandPalette"));
const KeyboardShortcutsModal = lazy(() => import("@/components/common/KeyboardShortcutsModal"));

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
// AdminLayout is lazy so public visitors never download the CMS shell. It
// owns an inner <Suspense> around <Outlet/>, so the sidebar/header stay
// mounted while manager pages below load (no empty-shell flash).
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const EventsManager = lazy(() => import("./pages/admin/EventsManager"));
const TeamManager = lazy(() => import("./pages/admin/TeamManager"));
const LeadershipManager = lazy(() => import("./pages/admin/LeadershipManager"));
const ScheduleManager = lazy(() => import("./pages/admin/ScheduleManager"));
const ProjectsManager = lazy(() => import("./pages/admin/ProjectsManager"));
const GalleryManager = lazy(() => import("./pages/admin/GalleryManager"));
const EnrollmentManager = lazy(() => import("./pages/admin/EnrollmentManager"));

const TeachersManager = lazy(() => import("./pages/admin/TeachersManager"));
const RolesManager = lazy(() => import("./pages/admin/RolesManager"));
const UsersManager = lazy(() => import("./pages/admin/UsersManager"));
const NotificationsManager = lazy(() => import("./pages/admin/NotificationsManager"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ActivityLog = lazy(() => import("./pages/admin/ActivityLog"));
const ProfileSettings = lazy(() => import("./pages/admin/ProfileSettings"));
const BlogManager = lazy(() => import("./pages/admin/BlogManager"));
const BlogEditor = lazy(() => import("./pages/admin/BlogEditor"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const News = lazy(() => import("./pages/News"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const LearningHub = lazy(() => import("./pages/LearningHub"));
// Learning Hub Pages
const LandingPageManager = lazy(() => import("@/pages/admin/LandingPageManager"));
const LearningHubManager = lazy(() => import("@/pages/admin/LearningHubManager"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const WorkshopDetail = lazy(() => import("@/pages/WorkshopDetail"));
const MyLearning = lazy(() => import("@/pages/MyLearning"));
const Classroom = lazy(() => import("@/pages/Classroom"));
const Certificate = lazy(() => import("@/pages/Certificate"));
const VerifyCertificate = lazy(() => import("@/pages/VerifyCertificate"));
const InstructorPublic = lazy(() => import("@/pages/InstructorPublic"));

// Student Portal Pages
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const StudentForgotPassword = lazy(() => import("./pages/StudentForgotPassword"));
const StudentResetPassword = lazy(() => import("./pages/StudentResetPassword"));
const StudentChangePassword = lazy(() => import("./pages/StudentChangePassword"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentRoute = lazy(() => import("./components/auth/StudentRoute"));

// Section pages
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const LeadershipPage = lazy(() => import("@/pages/LeadershipPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));

// Boot intro is fetched eagerly on first render (parallel with the Index
// chunk, not after it). Its own documented contract handles replay/forcing.
const BootScreen = lazy(() => import("@/components/loading/BootScreen"));

// queryClient now lives in src/lib/queryClient.ts (module-scoped, shared
// with StudentAuthContext which clears it on sign-out).

const OfflineBanner = () => {
  const { isOnline } = useOnlineStatus();
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const height = isOnline ? 0 : bannerRef.current?.offsetHeight ?? 40;
    document.documentElement.style.setProperty("--offline-banner-h", `${height}px`);
    return () => {
      document.documentElement.style.setProperty("--offline-banner-h", "0px");
    };
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div
      ref={bannerRef}
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[99999] bg-destructive/95 text-destructive-foreground px-4 py-2.5 text-center text-sm font-medium shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="size-4" aria-hidden="true" />
        <span>You're offline. Some features may not work until you reconnect.</span>
      </div>
    </div>
  );
};

// Boot intro rides in its own small chunk instead of inside the lazy Index
// chunk, so a first visit downloads the whole landing page BEFORE the
// motion graphic could start — visitors saw the generic "Loading..." spinner
// first and the show only afterwards. Mounted here the intro plays as soon as
// this small chunk lands, while the Index chunk keeps downloading behind it.
// Home-route only (unchanged behaviour: the show never played on deep links
// to other pages), and the session contract inside BootScreen still makes it
// a once-per-session, reduced-motion- and hash-safe gate.
const BootGate = () => {
  const { pathname } = useLocation();
  if (pathname !== "/") return null;
  return (
    <Suspense fallback={null}>
      <BootScreen />
    </Suspense>
  );
};

const AdminIndexRoute = () => {
  const { role, loading, hasPermission } = useRole();
  if (loading) return <Loading size="lg" className="py-32" />;
  if (role === "admin" || hasPermission("analytics")) return <Analytics />;
  return <Navigate to={getCMSLandingPath(role)} replace />;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const GlobalCommandListeners = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hasOpenedPalette, setHasOpenedPalette] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [hasOpenedShortcuts, setHasOpenedShortcuts] = useState(false);

  useEffect(() => {
    const openPalette = () => {
      setHasOpenedPalette(true);
      setPaletteOpen(true);
    };
    const openShortcuts = () => {
      setHasOpenedShortcuts(true);
      setShortcutsOpen(true);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHasOpenedPalette(true);
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditableTarget(e.target)) {
        e.preventDefault();
        setHasOpenedShortcuts(true);
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("yicdvp:open-command-palette", openPalette);
    window.addEventListener("yicdvp:open-shortcuts", openShortcuts);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("yicdvp:open-command-palette", openPalette);
      window.removeEventListener("yicdvp:open-shortcuts", openShortcuts);
    };
  }, []);

  return (
    <>
      {hasOpenedPalette && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </Suspense>
      )}
      {hasOpenedShortcuts && (
        <Suspense fallback={null}>
          <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </Suspense>
      )}
    </>
  );
};

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <RoleProvider>
          <StudentAuthProvider>
            <GamificationProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </GamificationProvider>
          </StudentAuthProvider>
        </RoleProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

const App = () => (
  <LazyMotion features={loadFeatures} strict>
    <AppProviders>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <PwaUpdatePrompt />
        <BrowserRouter>
          <SkipToContent />
          <RouteAnnouncer />
          <GlobalCommandListeners />
          <ScrollToTop />
          <SmoothScroll>
            <BootGate />
            <LenisModalBridge />
            <Suspense fallback={<RouteSkeletons />}>
              <RouteErrorBoundary name="root">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/project/:id" element={<ProjectDetail />} />
                  <Route path="/learning-hub" element={<LearningHub />} />
                  <Route path="/learning-hub/my-learning" element={<StudentRoute><MyLearning /></StudentRoute>} />
                  <Route path="/learning-hub/course/:slug" element={<CourseDetail />} />
                  <Route path="/learning-hub/instructor/:slug" element={<InstructorPublic />} />
                  <Route path="/learning-hub/classroom/:courseId" element={<StudentRoute><Classroom /></StudentRoute>} />
                  <Route path="/learning-hub/certificate/:courseId" element={<StudentRoute><Certificate /></StudentRoute>} />
                  <Route path="/learning-hub/workshop/:id" element={<WorkshopDetail />} />
                  {/* Public: anyone holding a certificate ID can confirm it.
                      Keep outside StudentRoute — verifiers are not students. */}
                  <Route path="/verify" element={<VerifyCertificate />} />
                  <Route path="/verify/:code" element={<VerifyCertificate />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />

                  {/* Student Portal */}
                  <Route path="/student/login" element={<StudentLogin />} />
                  <Route path="/student/forgot-password" element={<StudentForgotPassword />} />
                  <Route path="/student/reset-password" element={<StudentResetPassword />} />
                  <Route path="/student/change-password" element={<StudentRoute><StudentChangePassword /></StudentRoute>} />
                  <Route path="/student/dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />

                  {/* Section pages */}
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/leadership" element={<LeadershipPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/contact" element={<ContactPage />} />

                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route
                    path="/admin"
                    element={
                      <RouteErrorBoundary name="admin">
                        <AdminLayout />
                      </RouteErrorBoundary>
                    }
                  >
                    <Route index element={<AdminIndexRoute />} />
                    <Route path="teachers" element={<TeachersManager />} />
                    <Route path="events" element={<EventsManager />} />
                    <Route path="team" element={<TeamManager />} />
                    <Route path="schedule" element={<ScheduleManager />} />
                    <Route path="projects" element={<ProjectsManager />} />
                    <Route path="gallery" element={<GalleryManager />} />
                    <Route path="enrollments" element={<EnrollmentManager />} />
                    <Route path="users" element={<UsersManager />} />
                    <Route path="roles" element={<RolesManager />} />
                    <Route path="notifications" element={<NotificationsManager />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="blog" element={<BlogManager />} />
                    <Route path="blog/edit" element={<BlogEditor />} />
                    <Route path="activity-log" element={<ActivityLog />} />
                    <Route path="profile" element={<ProfileSettings />} />
                    <Route path="landing" element={<LandingPageManager />} />
                    <Route path="learning-hub" element={<LearningHubManager />} />
                    <Route path="leadership" element={<LeadershipManager />} />
                  </Route>

                  <Route path="/error/:code" element={<ErrorPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </RouteErrorBoundary>
            </Suspense>
          </SmoothScroll>
        </BrowserRouter>
      </ErrorBoundary>
    </AppProviders>
  </LazyMotion>
);

export default App;
