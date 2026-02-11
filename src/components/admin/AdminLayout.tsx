import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";
import clubLogo from "@/assets/club-logo.png";
import {
  AppRole,
  CMS_ACCESS_ROLES,
  ROLE_PERMISSIONS,
  PAGE_PERMISSION_MAP
} from "@/contexts/RoleContext";

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

  // Track user session activity for active users feature
  useSessionTracking();

  // Close sidebar when route changes (mobile)
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

  const checkAdminAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/admin/login");
        return;
      }

      setUserEmail(user.email || "");

      // Fetch user profile for name and avatar
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("Profile fetch warning:", profileError.message);
        }

        if (profile) {
          setUserName(profile.full_name || "");
          setUserAvatar(profile.avatar_url || "");
        }
      } catch (profileErr) {
        // Non-fatal: Profile may not exist yet
        console.warn("Could not fetch profile:", profileErr);
      }

      // Check user_roles table for any CMS access role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.warn("Role check warning:", roleError.message);
      }

      if (roleData?.role && CMS_ACCESS_ROLES.includes(roleData.role as AppRole)) {
        setUserRole(roleData.role as AppRole);
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Also check users_management with roles table for extended role system
      const { data: mgmtData, error: mgmtError } = await supabase
        .from("users_management")
        .select("role_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // If we have a role_id, fetch the role name separately
      let roleName: string | null = null;
      if (mgmtData?.role_id) {
        const { data: roleData, error: roleFetchError } = await supabase
          .from("roles")
          .select("name")
          .eq("id", mgmtData.role_id)
          .maybeSingle();
        if (roleFetchError) {
          console.warn("Role name fetch warning:", roleFetchError.message);
        }
        roleName = roleData?.name ?? null;
      }

      if (roleName && CMS_ACCESS_ROLES.includes(roleName as AppRole)) {
        setUserRole(roleName as AppRole);
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Check if user exists but has no role
      if (!roleData && !mgmtData) {
        setPendingRole(true);
        setLoading(false);
        return;
      }

      // No valid CMS role found
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the CMS.",
        variant: "destructive",
      });
      await supabase.auth.signOut();
      navigate("/admin/login");
    } catch (error) {
      console.error("Access check error:", error);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    checkAdminAccess();

    // Subscribe to realtime profile updates to keep sidebar in sync
    const channel = supabase.channel('admin-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Refresh profile data when any profile changes
          // In a real app we would filter by ID, but simpler to just re-fetch for now
          // as the payload filter id=eq.userid is tricky with async
          checkAdminAccess();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      // Only remove channel if it's in a stable state to avoid WebSocket errors
      if (channel.state === 'joined' || channel.state === 'joining') {
        supabase.removeChannel(channel).catch(() => {
          // Silently ignore errors during cleanup
        });
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
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending role message
  if (pendingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center glass-card p-8 rounded-2xl">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
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
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Button onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
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
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
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

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-lg ring-2 ring-primary/20">
            <img
              src={clubLogo}
              alt="Young Innovators Club Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-bold gradient-text">CMS</h2>
            <p className="text-xs text-muted-foreground">Innovators Club</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-card to-muted/50 border border-primary/5 shadow-sm relative group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px] shadow-md shrink-0">
            <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover type-profile-pic" />
              ) : (
                <span className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-xs sm:text-sm">
                  {getInitials(userName)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <p className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors">
              {userName || 'User'}
            </p>
            <div className="flex items-center mt-0.5">
              <Shield className="w-3 h-3 mr-1 text-primary/70" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {getRoleDisplayName(userRole)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="space-y-1.5 flex-1 overflow-y-auto">
        <Link to="/" onClick={() => setSidebarOpen(false)}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
          >
            <Home className="w-5 h-5" />
            Home Page
          </Button>
        </Link>

        <Link to="/admin/profile" onClick={() => setSidebarOpen(false)}>
          <Button
            variant={location.pathname === "/admin/profile" ? "default" : "ghost"}
            className="w-full justify-start gap-3"
          >
            <UserCircle className="w-5 h-5" />
            Profile Settings
          </Button>
        </Link>

        {navItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
            <Button
              variant={location.pathname === item.path ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="pt-4 mt-auto">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full justify-start gap-3"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background cms-theme">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 glass-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow ring-2 ring-primary/20">
            <img
              src={clubLogo}
              alt="CMS Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold gradient-text">CMS</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border border-primary/20 transition-all"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-primary" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${sidebarOpen ? "visible" : "invisible pointer-events-none"
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 backdrop-blur-sm bg-background/80 transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar Panel */}
        <aside
          className={`absolute left-0 top-0 h-full w-72 sm:w-80 glass-card border-r border-border flex flex-col p-6 transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 glass-card border-r border-border flex-col p-6">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;