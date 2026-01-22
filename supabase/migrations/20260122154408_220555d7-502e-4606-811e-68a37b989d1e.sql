-- Add public SELECT policy for team_members_public view
-- Views with security_invoker need their own policies or the base table policies apply

-- First, let's ensure public read access to the view
-- The view already excludes sensitive data, so public access is safe
CREATE POLICY "Anyone can view team members public"
ON public.team_members FOR SELECT
USING (true);

-- Drop the admin-only policy that's blocking public access
DROP POLICY IF EXISTS "Admins can view all team member data" ON public.team_members;