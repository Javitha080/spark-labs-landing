// react-doctor-disable no-giant-component
import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import {
  LogOut,
  Home,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminHeader } from "./layout/AdminHeader";
import { AdminSidebar } from "./layout/AdminSidebar";
import { ALL_NAV_ITEMS } from "./adminNavItems";
import { useRole } from "@/contexts/RoleContext";
import { getCMSLandingPath } from "@/lib/rbac";
import { logError } from "@/lib/errors";
import { Loading } from "@/components/common/loading";

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

  const [profileDone, setProfileDone] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track user session activity for active users feature
  useSessionTracking();

  // The dropdown drawer is closed by explicit click handlers in AdminSidebar
  // (every link and the backdrop call setSidebarOpen(false)), so no route-sync
  // effect is needed here.

  // Prevent background scroll when sidebar is open on mobile.
  // Stop Lenis (which hijacks the html element's wheel/touch) so the
  // page underneath does not scroll while the drawer is up.
  useEffect(() => {
    const lenis = (window as unknown as { lenis?: { stop: () => void; start: () => void } }).lenis;
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      lenis?.stop();
    } else {
      document.body.style.overflow = '';
      lenis?.start();
    }
    return () => {
      document.body.style.overflow = '';
      lenis?.start();
    };
  }, [sidebarOpen]);

  const mountedRef = useRef(true);

  // Fetch user profile data once CMS access is confirmed
  useEffect(() => {
    mountedRef.current = true;
    let activeChannel: ReturnType<typeof supabase.channel> | undefined;

    const fetchProfile = async () => {
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
        // Even a failed fetch resolves the loading gate so the CMS shell is
        // never stuck on the spinner.
        if (mountedRef.current) setProfileDone(true);
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
    }

    return () => {
      mountedRef.current = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel).catch(() => {});
      }
    };
  }, [roleLoading, user, canAccessCMS]);

  // First CMS page the current role may visit - used as the redirect target
  // when a user opens a page they don't have permission for.
  const getFirstAccessiblePage = useCallback((): string | null => {
    const landing = getCMSLandingPath(userRole);
    if (landing && canAccessPage(landing)) {
      return landing;
    }
    for (const item of ALL_NAV_ITEMS) {
      if (hasPermission(item.permission)) {
        return item.path;
      }
    }
    return null;
  }, [userRole, canAccessPage, hasPermission]);

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
  }, [
    roleLoading,
    user,
    userRole,
    location.pathname,
    navigate,
    toast,
    canAccessCMS,
    canAccessPage,
    getFirstAccessiblePage,
  ]);

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

  // Render-time page gate (M10/L7): the enforcement effect runs after paint,
  // so an unauthorized <Outlet /> used to mount first and fire that page's
  // Supabase reads before being redirected. Derive the verdict during render
  // and keep the shell up without mounting protected children.
  const pageAllowed = userRole
    ? canAccessPage(location.pathname)
    : false;

  if (roleLoading || (canAccessCMS() && user && !profileDone)) {
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

  // CMS access confirmed but the specific page is not allowed: render the
  // shell only. The effect below toasts and redirects to the first page the
  // role may visit — the protected content itself never mounts.
  if (!pageAllowed) {
    return (
      <div className="min-h-screen bg-background cms-theme">
        <AdminHeader setSidebarOpen={setSidebarOpen} />

        <AdminSidebar
          userName={userName}
          userAvatar={userAvatar}
          userRole={userRole}
          navItems={ALL_NAV_ITEMS.filter(item => hasPermission(item.permission))}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          sidebarOpen={sidebarOpen}
        />

        <main id="main-content" tabIndex={-1} className="lg:ml-64 pt-16 lg:pt-0 min-h-screen min-w-0 overflow-x-hidden focus:outline-none">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full">
            <Loading size="lg" className="py-32" />
          </div>
        </main>
      </div>
    );
  }

  // Filter nav items based on user role permissions
  const navItems = ALL_NAV_ITEMS.filter(item => hasPermission(item.permission));

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
      <main id="main-content" tabIndex={-1} className="lg:ml-64 pt-16 lg:pt-0 min-h-screen min-w-0 overflow-x-hidden focus:outline-none">
        <div className="p-4 sm:p-6 lg:p-8 max-w-full">
          {/* Local boundary: manager pages are lazy chunks. Without it they
              suspend to the app-root boundary, which unmounts this whole
              shell (sidebar + header) on every first visit to a page. */}
          <Suspense fallback={<Loading size="lg" className="py-32" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
