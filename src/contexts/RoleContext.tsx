// react-doctor-disable no-react19-deprecated-apis
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase, getSharedSession } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { setAdminBypass, clearAdminBypass } from '@/lib/antiDebug';
import { logError } from '@/lib/errors';

import { AppRole, CMS_ACCESS_ROLES, ROLE_PERMISSIONS, PAGE_PERMISSION_MAP } from '@/lib/rbac';
export { CMS_ACCESS_ROLES, ROLE_PERMISSIONS, PAGE_PERMISSION_MAP };
export type { AppRole };
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

  // Latest identity seen by the auth listener, used to discard role results
  // that belong to a user who has signed out / switched while their RPC was
  // in flight (otherwise a resolved admin role could be applied to a null
  // session, re-instating an admin bypass for nobody).
  const currentUserRef = useRef<User | null>(null);

  // Single-flight role lookup per user. On load the INITIAL_SESSION callback
  // and the explicit getSession() path both resolve the role, and supabase-js
  // re-emits SIGNED_IN on every tab refocus - each used to fire its own
  // get_cms_role RPC. Callers now share one promise per user id.
  const roleCacheRef = useRef<{ userId: string; promise: Promise<AppRole> } | null>(null);
  const resolveRole = useCallback((userId: string, force = false): Promise<AppRole> => {
    const cached = roleCacheRef.current;
    if (!force && cached && cached.userId === userId) return cached.promise;
    const promise: Promise<AppRole> = (async () => {
      try {
        // Single source of truth: get_cms_role unifies user_roles + users_management
        // with the same precedence (admin > editor > coordinator > content_creator)
        // the Worker enforces. The old .maybeSingle() on user_roles kept an
        // arbitrary row for multi-role users, which could disagree with the Worker.
        const { data: cmsRole, error } = await supabase.rpc("get_cms_role", {
          p_user_id: userId,
        });
        if (error) throw error;
        return (typeof cmsRole === "string" ? cmsRole : null) as AppRole;
      } catch (error) {
        logError(error, "RoleContext.fetchRole");
        // An errored lookup (network hiccup, 5xx) must not stay cached for the
        // whole session: drop the entry so the next auth event retries instead
        // of replaying a cached null that permanently hides CMS access. A
        // legitimate "no CMS role" answer still resolves and stays cached.
        if (roleCacheRef.current?.userId === userId) roleCacheRef.current = null;
        return null;
      }
    })();
    roleCacheRef.current = { userId, promise };
    return promise;
  }, []);

  const refreshRole = useCallback(async () => {
    const uid = currentUserRef.current?.id;
    if (uid) {
      const userRole = await resolveRole(uid, true);
      setRole((prev) => (prev === userRole ? prev : userRole));
    }
  }, [resolveRole]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // getSharedSession() below handles the initial mount load.
        if (event === 'INITIAL_SESSION') return;

        if ((event as string) === 'TOKEN_REFRESH_MISSING') {
          logError(new Error('Refresh token missing'), "RoleContext.session");
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            logError(signOutErr, "RoleContext.session.signOut");
          }
          roleCacheRef.current = null;
          currentUserRef.current = null;
          if (mounted) {
            setUser(null);
            setRole(null);
            clearAdminBypass();
            setLoading(false);
          }
          return;
        }

        const incomingUser = session?.user ?? null;
        if (
          incomingUser &&
          currentUserRef.current?.id === incomingUser.id &&
          (event === 'TOKEN_REFRESHED' ||
            (event === 'SIGNED_IN' && roleCacheRef.current?.userId === incomingUser.id))
        ) {
          return;
        }

        if (mounted) {
          currentUserRef.current = incomingUser;
          setUser((prev) =>
            event !== 'USER_UPDATED' && prev && incomingUser && prev.id === incomingUser.id
              ? prev
              : incomingUser
          );
        }

        if (incomingUser) {
          const userId = incomingUser.id;
          setTimeout(async () => {
            if (!mounted) return;
            const userRole = await resolveRole(userId, event === 'USER_UPDATED');
            if (!mounted) return;
            if (currentUserRef.current?.id !== userId) return;
            setRole((prev) => (prev === userRole ? prev : userRole));
            setAdminBypass(CMS_ACCESS_ROLES.includes(userRole));
            setLoading(false);
          }, 0);
        } else {
          roleCacheRef.current = null;
          if (mounted) {
            setRole((prev) => (prev === null ? prev : null));
            clearAdminBypass();
            setLoading(false);
          }
        }
      }
    );

    getSharedSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        logError(error, "RoleContext.getSession");
        if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            logError(signOutErr, "RoleContext.getSession.signOut");
          }
          if (mounted) {
            currentUserRef.current = null;
            setUser(null);
            setRole(null);
            clearAdminBypass();
          }
        }
        if (mounted) setLoading(false);
        return;
      }

      const initialUser = session?.user ?? null;
      if (mounted) {
        currentUserRef.current = initialUser;
        setUser((prev) =>
          prev && initialUser && prev.id === initialUser.id ? prev : initialUser
        );
      }
      if (initialUser) {
        const userRole = await resolveRole(initialUser.id);
        if (mounted && currentUserRef.current?.id === initialUser.id) {
          setRole((prev) => (prev === userRole ? prev : userRole));
          setAdminBypass(CMS_ACCESS_ROLES.includes(userRole));
        }
      }
      if (mounted) setLoading(false);
    }).catch((err) => {
      logError(err, "RoleContext.getSession.catch");
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveRole]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!role) return false;
    if (role === 'admin') return true;

    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes('all') || permissions.includes(permission);
  }, [role]);

  const canAccessPage = useCallback((pagePath: string): boolean => {
    if (!role) return false;
    if (role === 'admin') return true;

    const permission = PAGE_PERMISSION_MAP[pagePath];
    if (!permission) return false;

    return hasPermission(permission);
  }, [role, hasPermission]);

  const canAccessCMS = useCallback((): boolean => {
    return role !== null && CMS_ACCESS_ROLES.includes(role);
  }, [role]);

  const getRoleBadgeColor = useCallback((): string => {
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
  }, [role]);

  const getRoleDisplayName = useCallback((): string => {
    if (!role) return 'No Role';
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
  }, [role]);

  const contextValue = useMemo(() => ({
    user,
    role,
    loading,
    hasPermission,
    canAccessPage,
    canAccessCMS,
    refreshRole,
    getRoleBadgeColor,
    getRoleDisplayName,
  }), [user, role, loading, hasPermission, canAccessPage, canAccessCMS, refreshRole, getRoleBadgeColor, getRoleDisplayName]);

  return (
    <RoleContext.Provider
      value={contextValue}
    >
      {children}
    </RoleContext.Provider>
  );
};

// Context + hook pair - the hook is intentionally exported beside its provider
// (standard React context pattern).
// eslint-disable-next-line react-refresh/only-export-components
export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
