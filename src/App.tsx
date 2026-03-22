import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { RoleProvider } from "@/contexts/RoleContext";
import { GamificationProvider } from "@/context/GamificationContext";
import { LearnerProvider } from "@/context/LearnerContext";
import { LoadingScreen } from "@/components/ui/loading";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AppLoader from "@/components/loading/AppLoader";
import { ThemeProvider } from "@/components/ThemeProvider";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const EventsManager = lazy(() => import("./pages/admin/EventsManager"));
const TeamManager = lazy(() => import("./pages/admin/TeamManager"));
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

// Section pages
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s — data stays fresh, reduces refetches
      gcTime: 1000 * 60 * 10, // 10min garbage collection
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Offline status hook — uses real connectivity probing, not just navigator.onLine
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Real connectivity check via HEAD request
    const checkConnectivity = async (): Promise<boolean> => {
      try {
        const response = await fetch(
          `/manifest.json?_cb=${Date.now()}`,
          { method: "HEAD", mode: "no-cors", cache: "no-store" }
        );
        return response.ok || response.type === "opaque";
      } catch {
        return false;
      }
    };

    const handleOnline = async () => {
      // Browser says online — verify with a real probe
      const reallyOnline = await checkConnectivity();
      setIsOnline(reallyOnline);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic re-check (every 30s) — browser events handle instant detection
    const interval = setInterval(async () => {
      if (!navigator.onLine) return;
      const reallyOnline = await checkConnectivity();
      setIsOnline(reallyOnline);
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ErrorBoundary>
          <AppLoader>
            <RoleProvider>
              <LearnerProvider>
                <GamificationProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <OfflineIndicator />
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true
                      }}
                    >
                      <Suspense fallback={<LoadingScreen />}>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/blog" element={<Blog />} />
                          <Route path="/blog/:slug" element={<BlogPost />} />
                          <Route path="/project/:id" element={<ProjectDetail />} />
                          <Route path="/learning-hub" element={<LearningHub />} />
                          <Route path="/learning-hub/my-learning" element={<MyLearning />} />
                          <Route path="/learning-hub/course/:slug" element={<CourseDetail />} />
                          <Route path="/learning-hub/classroom/:courseId" element={<Classroom />} />
                          <Route path="/learning-hub/workshop/:id" element={<WorkshopDetail />} />
                          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                          <Route path="/terms-of-service" element={<TermsOfService />} />

                          {/* Section pages */}
                          <Route path="/about" element={<AboutPage />} />
                          <Route path="/projects" element={<ProjectsPage />} />
                          <Route path="/team" element={<TeamPage />} />
                          <Route path="/events" element={<EventsPage />} />
                          <Route path="/gallery" element={<GalleryPage />} />
                          <Route path="/contact" element={<ContactPage />} />

                          <Route path="/admin/login" element={<AdminLogin />} />
                          <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<Analytics />} />
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
                          </Route>

                          <Route path="/error/:code" element={<ErrorPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </BrowserRouter>
                  </TooltipProvider>
                </GamificationProvider>
              </LearnerProvider>
            </RoleProvider>
          </AppLoader>
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span className="text-sm font-medium">You are currently offline</span>
    </div>
  );
};

export default App;
