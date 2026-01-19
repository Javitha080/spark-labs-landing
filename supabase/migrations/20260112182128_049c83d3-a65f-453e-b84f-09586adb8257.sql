-- Fix profiles RLS to allow admins to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Allow admins to view all profiles, regular users can view their own
CREATE POLICY "Users can view own or admins view all"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
);

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update own or admins update all"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id 
  OR public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
);

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (
  public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
);

-- Add policy for admins to insert profiles (for user creation)
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() = id 
  OR public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
);

-- Fix user_roles policies to properly allow admin management
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view user_roles"
ON public.user_roles FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can insert user_roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
);

CREATE POLICY "Admins can update user_roles"
ON public.user_roles FOR UPDATE
USING (
  public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
);

CREATE POLICY "Admins can delete user_roles"
ON public.user_roles FOR DELETE
USING (
  public.is_admin(auth.uid())
  OR public.is_admin_role(auth.uid())
);