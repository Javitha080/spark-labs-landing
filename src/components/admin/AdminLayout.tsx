// react-doctor-disable no-giant-component
import { useEffect, useState, useRef } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import {
  Calendar,
  Users,
  ClipboardList,
  LogOut,
  Home,
  Loader2,
  FolderKanban,
  Image,
  UserPlus,
  Shield,
  UserCog,
  Mail,
  BarChart3,
  BookOpen,
  AlertCircle,
  Activity,
  GraduationCap,
  Layout,
  Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminHeader } from "./layout/AdminHeader";
import { AdminSidebar } from "./layout/AdminSidebar";
import { useRole } from "@/contexts/RoleContext";
import { logError } from "@/lib/errors";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission: string; // Permission key required to access this
}

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Use centralized role context to prevent Supabase auth deadlocks
  const { 
    user, 
    role: userRole, 
    loading: roleLoading, 
    canAccessCMS, 
    canAccessPage, 
    hasPermission 
  } = useRole();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track user session activity for active users feature
  useSessionTracking();

  const getFirstAccessiblePage = (): string | null => {
    const navItems = getAllNavItems();
    for (const item of navItems) {
      if (hasPermission(item.permission)) {
        return item.path;
      }
    }
    return null;
  };

  // Check access when route changes (mobile)
  // react-doctor-disable no-mutable-in-deps
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  const mountedRef = useRef(true);

  // Fetch user profile data once CMS access is confirmed
  useEffect(() => {
    mountedRef.current = true;
    let activeChannel: ReturnType<typeof supabase.channel> | undefined;

    const fetchProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (mountedRef.current && data) {
          setUserName(data.full_name || "");
          setUserAvatar(data.avatar_url || "");
        }
      } catch (error) {
        logError(error, "AdminLayout.fetchProfile");
      } finally {
        if (mountedRef.current) setLoadingProfile(false);
      }
    };

    if (!roleLoading && user && canAccessCMS()) {
      fetchProfile();

      // Realtime subscription for profile updates
      activeChannel = supabase.channel('admin-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          () => {
            if (mountedRef.current) {
              fetchProfile();
            }
          }
        )
        .subscribe();
    } else if (!roleLoading) {
      setLoadingProfile(false);
    }

    return () => {
      mountedRef.current = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel).catch(() => {});
      }
    };
  }, [roleLoading, user, canAccessCMS]);

  // Handle access enforcement
  useEffect(() => {
    if (roleLoading) return; // Wait for context to initialize

    if (!user) {
      navigate("/admin/login");
      return;
    }

    if (!canAccessCMS()) {
      if (userRole) {
        // Has a role, but not a CMS role
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the CMS.",
          variant: "destructive",
        });
        supabase.auth.signOut().then(() => navigate("/admin/login"));
      }
      // If no userRole, they are pending, which is handled in render
      return;
    }

    // Has CMS access, check specific page access
    if (!canAccessPage(location.pathname)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      const firstAccessible = getFirstAccessiblePage();
      if (firstAccessible) {
        navigate(firstAccessible);
      }
    }
  // react-doctor-disable react-hooks/exhaustive-deps
  }, [roleLoading, user, userRole, location.pathname, navigate, toast]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logError(error, "AdminLayout.handleLogout");
    }
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/admin/login");
  };

  const getAllNavItems = (): NavItem[] => [
    { path: "/admin/teachers", icon: Users, label: "Teachers", permission: 'team' },
    { path: "/admin/events", icon: Calendar, label: "Events", permission: 'events' },
    { path: "/admin/team", icon: Users, label: "Team", permission: 'team' },
    { path: "/admin/schedule", icon: ClipboardList, label: "Schedule", permission: 'schedule' },
    { path: "/admin/projects", icon: FolderKanban, label: "Projects", permission: 'projects' },
    { path: "/admin/gallery", icon: Image, label: "Gallery", permission: 'gallery' },
    { path: "/admin/blog", icon: BookOpen, label: "Blog", permission: 'blog' },
    { path: "/admin/enrollments", icon: UserPlus, label: "Enrollments", permission: 'enrollments' },
    { path: "/admin/users", icon: UserCog, label: "Users", permission: 'users' },
    { path: "/admin/roles", icon: Shield, label: "Roles & Permissions", permission: 'roles' },
    { path: "/admin/notifications", icon: Mail, label: "Notifications", permission: 'notifications' },
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: 'analytics' },
    { path: "/admin/activity-log", icon: Activity, label: "Activity Log", permission: 'analytics' },
    { path: "/admin/landing", icon: Layout, label: "Landing Page", permission: 'projects' },
    { path: "/admin/learning-hub", icon: GraduationCap, label: "Learning Hub", permission: 'learning_hub' },
    { path: "/admin/leadership", icon: Crown, label: "Leadership", permission: 'team' },
  ];

  if (roleLoading || (canAccessCMS() && loadingProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending role message if user is logged in but has NO role and thus no CMS access
  if (user && !userRole && !canAccessCMS()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center glass-card p-8 rounded-2xl">
          <div className="size-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Pending Role Assignment</h2>
          <p className="text-muted-foreground mb-6">
            Your account is pending role assignment. Please contact an administrator to be assigned a role.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Logged in as: <span className="font-medium">{user?.email || ""}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
            <Button onClick={() => navigate("/")}>
              <Home className="size-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessCMS()) {
    return null;
  }

  // Filter nav items based on user role permissions
  const navItems = getAllNavItems().filter(item => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-background cms-theme">
      <AdminHeader setSidebarOpen={setSidebarOpen} />
      
      <AdminSidebar
        userName={userName}
        userAvatar={userAvatar}
        userRole={userRole}
        navItems={navItems}
        setSidebarOpen={setSidebarOpen}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
