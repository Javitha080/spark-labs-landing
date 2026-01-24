import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'editor' | 'content_creator' | 'coordinator' | 'user' | null;

// Define which roles can access the CMS
export const CMS_ACCESS_ROLES: AppRole[] = ['admin', 'editor', 'content_creator', 'coordinator'];

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['all'],
  editor: ['home', 'events', 'team', 'schedule', 'projects', 'gallery', 'blog'],
  content_creator: ['blog', 'gallery', 'projects'],
  coordinator: ['events', 'enrollments', 'schedule', 'notifications'],
};

// Map page paths to permission keys
export const PAGE_PERMISSION_MAP: Record<string, string> = {
  '/admin': 'home',
  '/admin/events': 'events',
  '/admin/team': 'team',
  '/admin/schedule': 'schedule',
  '/admin/projects': 'projects',
  '/admin/gallery': 'gallery',
  '/admin/blog': 'blog',
  '/admin/enrollments': 'enrollments',
  '/admin/users': 'users',
  '/admin/roles': 'roles',
  '/admin/notifications': 'notifications',
  '/admin/analytics': 'analytics',
};

interface RoleContextType {
  user: User | null;
  role: AppRole;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  canAccessPage: (pagePath: string) => boolean;
  canAccessCMS: () => boolean;
  refreshRole: () => Promise<void>;
  getRoleBadgeColor: () => string;
  getRoleDisplayName: () => string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<AppRole> => {
    try {
      // Check user_roles table first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleData?.role) {
        return roleData.role as AppRole;
      }

      // Also check users_management with roles table for extended role system
      const { data: mgmtData } = await supabase
        .from('users_management')
        .select('roles(name)')
        .eq('user_id', userId)
        .single();

      const roleName = (mgmtData?.roles as any)?.name;
      if (roleName) {
        return roleName as AppRole;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const refreshRole = async () => {
    if (user) {
      const userRole = await fetchUserRole(user.id);
      setRole(userRole);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle token refresh errors specifically
        if ((event as string) === 'TOKEN_REFRESH_MISSING') {
          console.error('Refresh token missing, forcing logout');
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(async () => {
            const userRole = await fetchUserRole(session.user.id);
            setRole(userRole);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
        }
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        const userRole = await fetchUserRole(session.user.id);
        setRole(userRole);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!role) return false;
    if (role === 'admin') return true;

    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes('all') || permissions.includes(permission);
  };

  const canAccessPage = (pagePath: string): boolean => {
    if (!role) return false;
    if (role === 'admin') return true;

    const permission = PAGE_PERMISSION_MAP[pagePath];
    if (!permission) return false;

    return hasPermission(permission);
  };

  const canAccessCMS = (): boolean => {
    return role !== null && CMS_ACCESS_ROLES.includes(role);
  };

  const getRoleBadgeColor = (): string => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive';
      case 'editor':
        return 'bg-blue-500/20 text-blue-500';
      case 'content_creator':
        return 'bg-green-500/20 text-green-500';
      case 'coordinator':
        return 'bg-orange-500/20 text-orange-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleDisplayName = (): string => {
    if (!role) return 'No Role';
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  };

  return (
    <RoleContext.Provider
      value={{
        user,
        role,
        loading,
        hasPermission,
        canAccessPage,
        canAccessCMS,
        refreshRole,
        getRoleBadgeColor,
        getRoleDisplayName,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
