
-- Rate-limited learner token creation
CREATE TABLE IF NOT EXISTS public.learner_token_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL DEFAULT 'unknown',
  email text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learner_token_rl_ip ON public.learner_token_rate_limits (ip_address, last_attempt_at);
CREATE INDEX IF NOT EXISTS idx_learner_token_rl_email ON public.learner_token_rate_limits (email, last_attempt_at);

ALTER TABLE public.learner_token_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view learner token rate limits" ON public.learner_token_rate_limits
FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Deny direct insert" ON public.learner_token_rate_limits FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny direct update" ON public.learner_token_rate_limits FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct delete" ON public.learner_token_rate_limits FOR DELETE USING (false);

CREATE OR REPLACE FUNCTION public.create_learner_token(
  p_token text,
  p_name text,
  p_email text,
  p_grade text,
  p_phone text,
  p_browser_fingerprint text DEFAULT NULL,
  p_enrollment_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL
) RETURNS public.learner_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_ip text;
  v_ip_count integer;
  v_email_count integer;
  v_row public.learner_tokens;
BEGIN
  v_email := lower(trim(coalesce(p_email, '')));
  v_ip := nullif(left(trim(coalesce(p_ip_address, 'unknown')), 64), '');
  IF v_ip IS NULL THEN v_ip := 'unknown'; END IF;

  IF char_length(coalesce(p_token, '')) < 32 OR char_length(p_token) > 64 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;
  IF char_length(btrim(coalesce(p_name, ''))) < 2 OR char_length(btrim(p_name)) > 100 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF v_email = '' OR char_length(v_email) > 255 OR v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF char_length(btrim(coalesce(p_phone, ''))) < 7 OR char_length(btrim(p_phone)) > 20 THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;
  IF char_length(btrim(coalesce(p_grade, ''))) < 1 OR char_length(btrim(p_grade)) > 50 THEN
    RAISE EXCEPTION 'Invalid grade';
  END IF;

  IF v_ip <> 'unknown' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM public.learner_token_rate_limits
    WHERE ip_address = v_ip AND last_attempt_at > now() - interval '1 hour';
    IF v_ip_count >= 5 THEN
      RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_email_count
  FROM public.learner_token_rate_limits
  WHERE email = v_email AND last_attempt_at > now() - interval '1 hour';
  IF v_email_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded for this email. Please try again later.';
  END IF;

  INSERT INTO public.learner_token_rate_limits (ip_address, email)
  VALUES (v_ip, v_email);

  INSERT INTO public.learner_tokens (token, name, email, grade, phone, browser_fingerprint, enrollment_id)
  VALUES (p_token, btrim(p_name), v_email, btrim(p_grade), btrim(p_phone), p_browser_fingerprint, p_enrollment_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_learner_token(text, text, text, text, text, text, uuid, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can create learner token" ON public.learner_tokens;

ALTER PUBLICATION supabase_realtime DROP TABLE public.roles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.permissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.role_permissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.analytics_events;
