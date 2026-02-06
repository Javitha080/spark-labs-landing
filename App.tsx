import { Suspense, lazy } from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "./contexts/RoleContext";
import { LoadingScreen } from "./components/ui/loading";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import AppLoader from "./components/loading/AppLoader";

// Lazy load pages
const Index = lazy(() => import("./views/Index"));
const NotFound = lazy(() => import("./views/NotFound"));
const ErrorPage = lazy(() => import("./views/ErrorPage"));
const AdminLogin = lazy(() => import("./views/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const EventsManager = lazy(() => import("./views/admin/EventsManager"));
const TeamManager = lazy(() => import("./views/admin/TeamManager"));
const ScheduleManager = lazy(() => import("./views/admin/ScheduleManager"));
const ProjectsManager = lazy(() => import("./views/admin/ProjectsManager"));
const GalleryManager = lazy(() => import("./views/admin/GalleryManager"));
const EnrollmentManager = lazy(() => import("./views/admin/EnrollmentManager"));

const RolesManager = lazy(() => import("./views/admin/RolesManager"));
const UsersManager = lazy(() => import("./views/admin/UsersManager"));
const NotificationsManager = lazy(() => import("./views/admin/NotificationsManager"));
const Analytics = lazy(() => import("./views/admin/Analytics"));
const ActivityLog = lazy(() => import("./views/admin/ActivityLog"));
const BulkImportExport = lazy(() => import("./views/admin/BulkImportExport"));
const BlogManager = lazy(() => import("./views/admin/BlogManager"));
const BlogEditor = lazy(() => import("./views/admin/BlogEditor"));
const Blog = lazy(() => import("./views/Blog"));
const BlogPost = lazy(() => import("./views/BlogPost"));
const ProjectDetail = lazy(() => import("./views/ProjectDetail"));
const PrivacyPolicy = lazy(() => import("./views/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./views/TermsOfService"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AppLoader>
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
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

export default App;
