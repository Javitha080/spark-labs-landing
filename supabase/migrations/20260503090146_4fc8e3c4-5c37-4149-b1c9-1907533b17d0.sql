
-- 1. Remove direct INSERT on login_attempts; force usage of record_login_attempt RPC
DROP POLICY IF EXISTS "Authenticated users can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Anon can insert login attempts" ON public.login_attempts;

-- 2. Add IP-based throttle inside record_login_attempt to prevent lockout abuse
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean, p_ip_address text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ip_count integer;
BEGIN
  -- IP-based throttle: reject if same IP logged >20 attempts in last minute
  IF p_ip_address IS NOT NULL AND p_ip_address <> '' AND p_ip_address <> 'unknown' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM public.login_attempts
    WHERE ip_address = p_ip_address
      AND attempted_at > now() - interval '1 minute';
    IF v_ip_count >= 20 THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.login_attempts (email, success, ip_address, attempted_at)
  VALUES (LOWER(TRIM(p_email)), COALESCE(p_success, false), p_ip_address, now());
END;
$function$;

-- Keep EXECUTE grants only for authenticated (login form runs after user signs in via supabase auth call,
-- but pre-auth attempts must come through edge function/server; revoke from anon)
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO authenticated;

-- 3. Allow admins to view learner stats in CMS
CREATE POLICY "Admins can view all learner stats"
ON public.learning_user_stats
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR is_admin_role(auth.uid()));
