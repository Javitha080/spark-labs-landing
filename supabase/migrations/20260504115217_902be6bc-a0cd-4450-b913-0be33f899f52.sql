-- Keep direct writes to login_attempts blocked, but allow controlled logging via RPC
DROP POLICY IF EXISTS "Only admins can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Admins can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Authenticated users can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Authenticated can log attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Anon can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Authenticated can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_success boolean,
  p_ip_address text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_ip text;
  v_ip_count integer;
  v_email_ip_count integer;
BEGIN
  v_email := lower(trim(coalesce(p_email, '')));
  v_ip := nullif(left(trim(coalesce(p_ip_address, 'unknown')), 64), '');

  IF v_email = '' OR length(v_email) > 255 OR v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN;
  END IF;

  IF v_ip IS NULL THEN
    v_ip := 'unknown';
  END IF;

  -- Limit write amplification from the same reported IP.
  IF v_ip <> 'unknown' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM public.login_attempts
    WHERE ip_address = v_ip
      AND attempted_at > now() - interval '1 minute';

    IF v_ip_count >= 20 THEN
      RETURN;
    END IF;
  END IF;

  -- Limit repeated logging for the same email/IP pair.
  SELECT COUNT(*) INTO v_email_ip_count
  FROM public.login_attempts
  WHERE email = v_email
    AND ip_address = v_ip
    AND attempted_at > now() - interval '1 minute';

  IF v_email_ip_count >= 10 THEN
    RETURN;
  END IF;

  INSERT INTO public.login_attempts (email, success, ip_address, attempted_at)
  VALUES (v_email, coalesce(p_success, false), v_ip, now());
END;
$function$;

REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO anon, authenticated;