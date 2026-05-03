-- Remove direct INSERT policies that allow forging login attempts
DROP POLICY IF EXISTS "Anon can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Authenticated can insert login attempts" ON public.login_attempts;

-- Ensure record_login_attempt SECURITY DEFINER function exists and is callable by anon/authenticated
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO anon, authenticated;