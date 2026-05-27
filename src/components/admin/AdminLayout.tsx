import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
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
  Menu,
  X,
  Activity,
  UserCircle,
  GraduationCap,
  Layout,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";
import { AdminHeader } from "./layout/AdminHeader";
import { AdminSidebar } from "./layout/AdminSidebar";
import {
  AppRole,
  CMS_ACCESS_ROLES,
  ROLE_PERMISSIONS,
  PAGE_PERMISSION_MAP
} from "@/contexts/RoleContext";
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
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<AppRole>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [pendingRole, setPendingRole] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Track user session activity for active users feature
  useSessionTracking();

  const canAccessCurrentPage = (): boolean => {
    if (!userRole) return false;
    if (userRole === 'admin') return true;

    const permission = PAGE_PERMISSION_MAP[location.pathname];
    if (!permission) return true; // Allow access to undefined pages (index)

    return hasPermission(permission);
  };

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
  const cachedUserIdRef = useRef<string | null>(null);
  const profileLoadedRef = useRef(false);

  const checkAdminAccess = useCallback(async (forceRefresh = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (mountedRef.current) navigate("/admin/login");
        return;
      }

      // Skip re-fetching profile data if user hasn't changed and we already loaded
      if (!forceRefresh && cachedUserIdRef.current === user.id && profileLoadedRef.current && hasAccess) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      cachedUserIdRef.current = user.id;
      setUserEmail(user.email || "");

      const [profileRes, roleRes, mgmtRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("users_management").select("role_id").eq("user_id", user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        setUserName(profileRes.data.full_name || "");
        setUserAvatar(profileRes.data.avatar_url || "");
      }

      if (roleRes.data?.role && CMS_ACCESS_ROLES.includes(roleRes.data.role as AppRole)) {
        setUserRole(roleRes.data.role as AppRole);
        setHasAccess(true);
        profileLoadedRef.current = true;
        setLoading(false);
        return;
      }

      let roleName: string | null = null;
      if (mgmtRes.data?.role_id) {
        const { data: roleData } = await supabase
          .from("roles")
          .select("name")
          .eq("id", mgmtRes.data.role_id)
          .maybeSingle();
        roleName = roleData?.name ?? null;
      }

      if (roleName && CMS_ACCESS_ROLES.includes(roleName as AppRole)) {
        setUserRole(roleName as AppRole);
        setHasAccess(true);
        profileLoadedRef.current = true;
        setLoading(false);
        return;
      }

      if (!roleRes.data && !mgmtRes.data) {
        setPendingRole(true);
        setLoading(false);
        return;
      }

      toast({
        title: "Access Denied",
        description: "You don't have permission to access the CMS.",
        variant: "destructive",
      });
      await supabase.auth.signOut();
      if (mountedRef.current) navigate("/admin/login");
    } catch (error) {
      logError(error, "AdminLayout.checkAdminAccess");
      if (mountedRef.current) navigate("/admin/login");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [navigate, toast, hasAccess]);

  // oxlint-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    mountedRef.current = true;
    let activeChannel: ReturnType<typeof supabase.channel> | undefined;

    checkAdminAccess();

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mountedRef.current || !session?.user) return;

      const channel = supabase.channel('admin-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          },
          () => {
            if (mountedRef.current) {
              checkAdminAccess(true);
            }
          }
        )
        .subscribe((status) => {
          if (mountedRef.current && import.meta.env.DEV) {
            console.log('Realtime subscription status:', status);
          }
        });

      if (!mountedRef.current) {
        supabase.removeChannel(channel).catch(() => {});
        return;
      }

      activeChannel = channel;
    };

    setupSubscription();

    return () => {
      mountedRef.current = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel).catch(() => {});
      }
    };
  }, [checkAdminAccess]);

  // Check page access when location changes
  useEffect(() => {
    if (hasAccess && userRole) {
      const canAccess = canAccessCurrentPage();
      if (!canAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        // Redirect to first accessible page
        const firstAccessible = getFirstAccessiblePage();
        if (firstAccessible) {
          navigate(firstAccessible);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, hasAccess, userRole]);

  const hasPermission = (permission: string): boolean => {
    if (!userRole) return false;
    if (userRole === 'admin') return true;

    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes('all') || permissions.includes(permission);
  };



  const handleLogout = async () => {
    await supabase.auth.signOut();
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
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending role message
  if (pendingRole) {
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
            Logged in as: <span className="font-medium">{userEmail}</span>
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

  if (!hasAccess) {
    return null;
  }

  // Filter nav items based on user role permissions
  const navItems = getAllNavItems().filter(item => hasPermission(item.permission));

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive';
      case 'editor':
        return 'bg-blue-500/20 text-blue-500';
      case 'coordinator':
        return 'bg-orange-500/20 text-orange-500';
      case 'content_creator':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleDisplayName = (role: AppRole) => {
    if (!role) return 'Unknown';
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
  };

  const getInitials = (name: string) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
