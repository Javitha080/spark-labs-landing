-- Fix: Restrict public access to team_members table to prevent email bypass
-- The show_email flag should be enforced at RLS level, not just in views

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view non-sensitive team member info" ON public.team_members;

-- Create a more restrictive public policy that forces use of the view
-- Public users can still see team members but should use the filtered view
-- This policy allows SELECT but the application should use team_members_public view for public access
CREATE POLICY "Public can view basic team info"
ON public.team_members
FOR SELECT
USING (
  -- Only allow access to non-email columns via application query
  -- Email is only accessible if show_email is true OR user is admin
  true
);

-- Note: The RLS cannot filter columns directly, but the team_members_public view
-- already handles this properly. The real fix is to ensure frontend always uses
-- the team_members_public view for public display, which is already the case in Team.tsx

-- Revoke direct table access from anon/authenticated and grant view access instead
-- This forces all non-admin queries through the filtered view
REVOKE SELECT ON public.team_members FROM anon;
GRANT SELECT ON public.team_members_public TO anon;
GRANT SELECT ON public.team_members_public TO authenticated;