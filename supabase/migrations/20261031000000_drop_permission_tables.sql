-- Option A (erase): drop the unenforced granular-permission layer.
--
-- `permissions` / `role_permissions` / has_permission() were seeded and editable
-- in RolesManager but nothing in the stack ever consulted them: the Worker and
-- frontend use the static ROLE_PERMISSIONS map (src/lib/rbac.ts), and RLS uses
-- is_content_admin()/is_admin_role(). Keeping them presented a DB-driven
-- permission surface that did not exist. The enforced contract is now
-- unambiguous: roles carry identity, src/lib/rbac.ts carries permissions.
--
-- `roles` stays: it is a live store - users_management.role_id feeds
-- get_cms_role(), is_admin_role(), is_content_admin() and the Users/Roles
-- managers. Custom role names resolve to NULL in get_cms_role(), i.e. label
-- rows without CMS access, which is exactly what they always effectively were.

-- Zero consumers: only the definition in 20251101161548 and the generated type
-- ever referenced this function.
DROP FUNCTION IF EXISTS public.has_permission(_user_id uuid, _resource text, _action text);

DO $$
BEGIN
  -- Detach from the realtime publication if it exists and the tables are
  -- members (role_permissions already was removed by 20260504122301; keep
  -- this defensive so the migration re-runs cleanly on any altered env).
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.role_permissions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.permissions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Tables own their RLS policies; dropping them removes those with no action.
-- No other table references permissions (role_permissions' FKs are captured
-- by the drop). users_management's FK targets `roles`, which is untouched.
DROP TABLE IF EXISTS public.role_permissions;
DROP TABLE IF EXISTS public.permissions;
