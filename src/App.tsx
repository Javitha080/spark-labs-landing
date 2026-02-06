import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import { LoadingScreen } from "@/components/ui/loading";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AppLoader from "@/components/loading/AppLoader";

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
const BulkImportExport = lazy(() => import("./pages/admin/BulkImportExport"));
const BlogManager = lazy(() => import("./pages/admin/BlogManager"));
const BlogEditor = lazy(() => import("./pages/admin/BlogEditor"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const queryClient = new QueryClient();

// Offline status hook
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AppLoader>
        <RoleProvider>
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
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
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
                    <Route path="import-export" element={<BulkImportExport />} />

                  </Route>

                  <Route path="/error/:code" element={<ErrorPage />} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </RoleProvider>
      </AppLoader>
    </ErrorBoundary>
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
