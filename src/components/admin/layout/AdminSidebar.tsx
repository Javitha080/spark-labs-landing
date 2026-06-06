import React from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Home, UserCircle, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { clubLogo } from "@/components/ClubLogo";
import { ThemeToggle } from "../ThemeToggle";
import { AppRole } from "@/contexts/RoleContext";

export interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission: string;
}

interface AdminSidebarProps {
  userName: string;
  userAvatar: string;
  userRole: AppRole;
  navItems: NavItem[];
  setSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
  sidebarOpen: boolean;
}

export function AdminSidebar({
  userName,
  userAvatar,
  userRole,
  navItems,
  setSidebarOpen,
  handleLogout,
  sidebarOpen
}: AdminSidebarProps) {
  const location = useLocation();

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

  // react-doctor-disable no-nested-component-definition
  // react-doctor-disable no-unstable-nested-components
  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative size-10 rounded-lg overflow-hidden shadow-lg ring-2 ring-primary/20">
            <OptimizedImage
              src={clubLogo}
              alt="Young Innovators Club Logo"
              priority
              className="size-full object-cover bg-transparent"
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
          <button type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-card to-muted/50 border border-primary/5 shadow-sm relative group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px] shadow-md shrink-0">
            <div className="size-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="size-full object-cover type-profile-pic" />
              ) : (
                <span className="font-bold text-primary text-xs sm:text-sm">
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
              <Shield className="size-3 mr-1 text-primary/70" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {getRoleDisplayName(userRole)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-4 pr-2">
        <Link to="/" onClick={() => setSidebarOpen(false)}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
          >
            <Home className="size-5" />
            Home Page
          </Button>
        </Link>

        <Link to="/admin/profile" onClick={() => setSidebarOpen(false)}>
          <Button
            variant={location.pathname === "/admin/profile" ? "default" : "ghost"}
            className="w-full justify-start gap-3"
          >
            <UserCircle className="size-5" />
            Profile Settings
          </Button>
        </Link>

        {navItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
            <Button
              variant={location.pathname === item.path ? "default" : "ghost"}
              className="w-full justify-start gap-3"
            >
              <item.icon className="size-5" />
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
          <LogOut className="size-5" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
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
          role="presentation"
          aria-hidden="true"
        />

        {/* Sidebar Panel */}
        <aside
          className={`absolute left-0 top-0 h-[100dvh] w-72 sm:w-80 glass-card border-r border-border flex flex-col p-6 transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-[100dvh] w-64 glass-card border-r border-border flex-col p-6">
        <SidebarContent />
      </aside>
    </>
  );
}
