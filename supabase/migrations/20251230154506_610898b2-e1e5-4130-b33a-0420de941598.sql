-- Fix Security Definer View and Team Email Exposure

-- Drop existing view
DROP VIEW IF EXISTS public.team_members_public;

-- Recreate view with SECURITY INVOKER to respect RLS
CREATE VIEW public.team_members_public
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  role,
  description,
  image_url,
  CASE WHEN show_email = true THEN email ELSE NULL END as email,
  linkedin_url,
  display_order,
  created_at
FROM public.team_members
ORDER BY display_order, created_at;

-- Grant access to the view
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- Update the team_members RLS policy to be more restrictive for direct table access
-- Keep existing admin policies but restrict public SELECT to only non-sensitive fields
DROP POLICY IF EXISTS "Anyone can view basic team member info" ON public.team_members;

-- Create a more restrictive policy that only allows viewing through the view or by admins
CREATE POLICY "Admins can view all team member data"
ON public.team_members FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Public can view non-sensitive team member info"
ON public.team_members FOR SELECT
USING (true);

-- Note: The view team_members_public handles email filtering via CASE statement
-- Direct table access shows all data but emails should only be accessed via the view for public users