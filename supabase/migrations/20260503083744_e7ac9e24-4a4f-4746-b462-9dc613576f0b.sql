CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean, p_ip_address text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, ip_address, attempted_at)
  VALUES (LOWER(TRIM(p_email)), COALESCE(p_success, false), p_ip_address, now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO anon, authenticated;