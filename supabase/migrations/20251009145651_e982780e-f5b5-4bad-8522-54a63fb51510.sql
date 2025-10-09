-- Create login attempts tracking for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for login_attempts
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (true);

-- Create indices for better performance
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts(attempted_at);

-- Function to check login rate limit
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_attempt_count integer;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > now() - interval '15 minutes';
  
  -- Block if more than 5 failed attempts
  IF v_attempt_count >= 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to cleanup old login attempts (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - interval '30 days';
END;
$$;