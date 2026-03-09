-- Create a unified role-checking function that bridges both the old (user_roles)
-- and new (users_management + roles) RBAC systems.
-- Returns true if the user has admin, editor, or coordinator role in either system.

CREATE OR REPLACE FUNCTION public.is_content_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'coordinator'::app_role])
  )
  OR EXISTS (
    SELECT 1
    FROM public.users_management um
    JOIN public.roles r ON um.role_id = r.id
    WHERE um.user_id = _user_id
      AND r.name IN ('admin', 'editor', 'coordinator')
  );
$$;
