import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<EventsManager />} />
            <Route path="events" element={<EventsManager />} />
            <Route path="team" element={<TeamManager />} />
            <Route path="schedule" element={<ScheduleManager />} />
            <Route path="projects" element={<ProjectsManager />} />
            <Route path="gallery" element={<GalleryManager />} />
            <Route path="enrollments" element={<EnrollmentManager />} />
            <Route path="api-keys" element={<ApiKeysManager />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
