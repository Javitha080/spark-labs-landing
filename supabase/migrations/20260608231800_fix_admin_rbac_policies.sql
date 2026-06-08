-- Update the is_content_admin function to include content_creator
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
      AND role = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'coordinator'::app_role, 'content_creator'::app_role])
  )
  OR EXISTS (
    SELECT 1
    FROM public.users_management um
    JOIN public.roles r ON um.role_id = r.id
    WHERE um.user_id = _user_id
      AND r.name IN ('admin', 'editor', 'coordinator', 'content_creator')
  );
$$;

-- Fix policies for events
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;

CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  USING (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  USING (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

-- Fix policies for team_members
DROP POLICY IF EXISTS "Admins can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete team members" ON public.team_members;

CREATE POLICY "Admins can insert team members"
  ON public.team_members FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

CREATE POLICY "Admins can update team members"
  ON public.team_members FOR UPDATE
  USING (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

CREATE POLICY "Admins can delete team members"
  ON public.team_members FOR DELETE
  USING (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

-- Fix policies for schedule
DROP POLICY IF EXISTS "Admins can insert schedule" ON public.schedule;
DROP POLICY IF EXISTS "Admins can update schedule" ON public.schedule;
DROP POLICY IF EXISTS "Admins can delete schedule" ON public.schedule;

CREATE POLICY "Admins can insert schedule"
  ON public.schedule FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

CREATE POLICY "Admins can update schedule"
  ON public.schedule FOR UPDATE
  USING (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));

CREATE POLICY "Admins can delete schedule"
  ON public.schedule FOR DELETE
  USING (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));
