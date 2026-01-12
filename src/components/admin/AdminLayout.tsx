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
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";

type UserRole = 'admin' | 'editor' | 'coordinator' | 'content_creator' | null;

interface NavItem {
  path: string;
  icon: any;
  label: string;
  roles: UserRole[]; // Which roles can access this
}

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin/login");
        return;
      }

      setUserEmail(user.email || "");

      // Check user_roles table first (primary admin check)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role === 'admin') {
        setUserRole('admin');
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
      
      if (roleName === 'admin' || roleName === 'editor' || roleName === 'coordinator' || roleName === 'content_creator') {
        setUserRole(roleName as UserRole);
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // No valid role found
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin area.",
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  // Define nav items with role-based access
  const allNavItems: NavItem[] = [
    { path: "/admin/events", icon: Calendar, label: "Events", roles: ['admin', 'editor', 'coordinator'] },
    { path: "/admin/team", icon: Users, label: "Team", roles: ['admin', 'editor'] },
    { path: "/admin/schedule", icon: ClipboardList, label: "Schedule", roles: ['admin', 'editor', 'coordinator'] },
    { path: "/admin/projects", icon: FolderKanban, label: "Projects", roles: ['admin', 'editor', 'content_creator'] },
    { path: "/admin/gallery", icon: Image, label: "Gallery", roles: ['admin', 'editor', 'content_creator'] },
    { path: "/admin/blog", icon: BookOpen, label: "Blog", roles: ['admin', 'editor', 'content_creator'] },
    { path: "/admin/enrollments", icon: UserPlus, label: "Enrollments", roles: ['admin', 'coordinator'] },
    { path: "/admin/users", icon: UserCog, label: "Users", roles: ['admin'] },
    { path: "/admin/roles", icon: Shield, label: "Roles", roles: ['admin'] },
    { path: "/admin/notifications", icon: Mail, label: "Notifications", roles: ['admin', 'coordinator'] },
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics", roles: ['admin'] },
    { path: "/admin/api-keys", icon: Key, label: "API Keys", roles: ['admin'] },
  ];

  // Filter nav items based on user role
  const navItems = userRole === 'admin' 
    ? allNavItems 
    : allNavItems.filter(item => item.roles.includes(userRole));

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-500';
      case 'editor':
        return 'bg-blue-500/20 text-blue-500';
      case 'coordinator':
        return 'bg-green-500/20 text-green-500';
      case 'content_creator':
        return 'bg-purple-500/20 text-purple-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
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
                <h2 className="font-bold gradient-text">Admin CMS</h2>
                <p className="text-xs text-muted-foreground">Innovators Club</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* User info */}
          <div className="mb-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(userRole)}`}>
              {userRole?.charAt(0).toUpperCase()}{userRole?.slice(1).replace('_', ' ')}
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