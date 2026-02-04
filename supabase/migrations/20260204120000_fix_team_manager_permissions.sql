-- Fix Team Manager 403 Error
-- Previous migration revoked SELECT permission from 'authenticated' role, preventing admins
-- from fetching the team_members table for management.
-- We must GRANT SELECT back to 'authenticated' and rely on RLS for access control.

-- Grant SELECT permission to authenticated users (Admins are authenticated)
GRANT SELECT ON public.team_members TO authenticated;

-- Ensure RLS is enabled (it should be, but good to double check)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Verify the admin policy exists (re-applying just in case)
DROP POLICY IF EXISTS "Admins can view all team member data" ON public.team_members;
CREATE POLICY "Admins can view all team member data" 
ON public.team_members 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Note: Non-admins will still be blocked by RLS (they will see 0 rows), 
-- forcing them to use the team_members_public view as intended.
