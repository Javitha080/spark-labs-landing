import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Key,
  Shield,
  UserCog,
  Mail,
  BarChart3,
  BookOpen,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";
import { 
  AppRole, 
  CMS_ACCESS_ROLES, 
  ROLE_PERMISSIONS, 
  PAGE_PERMISSION_MAP 
} from "@/contexts/RoleContext";

interface NavItem {
  path: string;
  icon: any;
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
  const [pendingRole, setPendingRole] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

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

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin/login");
        return;
      }

      setUserEmail(user.email || "");

      // Check user_roles table for any CMS access role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role && CMS_ACCESS_ROLES.includes(roleData.role as AppRole)) {
        setUserRole(roleData.role as AppRole);
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Also check users_management with roles table for extended role system
      const { data: mgmtData } = await supabase
        .from("users_management")
        .select("roles(name)")
        .eq("user_id", user.id)
        .single();

      const roleName = (mgmtData?.roles as any)?.name;
      
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
    { path: "/admin/api-keys", icon: Key, label: "API Keys", permission: 'api-keys' },
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

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 glass-card border-r border-border">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">YIC</span>
              </div>
              <div>
                <h2 className="font-bold gradient-text">CMS</h2>
                <p className="text-xs text-muted-foreground">Innovators Club</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* User info with role badge */}
          <div className="mb-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground truncate mb-1">{userEmail}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(userRole)}`}>
              {getRoleDisplayName(userRole)}
            </span>
          </div>

          <nav className="space-y-2">
            <Link to="/">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Home className="w-5 h-5" />
                Home Page
              </Button>
            </Link>

            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
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

          <div className="absolute bottom-6 left-6 right-6">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full justify-start gap-3"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;