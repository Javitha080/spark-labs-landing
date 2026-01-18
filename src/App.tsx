import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import EventsManager from "./pages/admin/EventsManager";
import TeamManager from "./pages/admin/TeamManager";
import ScheduleManager from "./pages/admin/ScheduleManager";
import ProjectsManager from "./pages/admin/ProjectsManager";
import GalleryManager from "./pages/admin/GalleryManager";
import EnrollmentManager from "./pages/admin/EnrollmentManager";
import ApiKeysManager from "./pages/admin/ApiKeysManager";
import RolesManager from "./pages/admin/RolesManager";
import UsersManager from "./pages/admin/UsersManager";
import NotificationsManager from "./pages/admin/NotificationsManager";
import Analytics from "./pages/admin/Analytics";
import BlogManager from "./pages/admin/BlogManager";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ProjectDetail from "./pages/ProjectDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RoleProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<EventsManager />} />
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
              <Route path="api-keys" element={<ApiKeysManager />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </RoleProvider>
  </QueryClientProvider>
);

export default App;
