-- Fix Team Members View - Drop security invoker and recreate as security definer
DROP VIEW IF EXISTS public.team_members_public;

-- Recreate as security definer (bypasses RLS with controlled data exposure)
CREATE VIEW public.team_members_public 
WITH (security_barrier = true)
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

-- Set view ownership for SECURITY DEFINER behavior
ALTER VIEW public.team_members_public OWNER TO postgres;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- Enable Realtime for tables not already added
DO $$
BEGIN
  -- Try adding each table, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Add blocked_until column for enhanced rate limiting
ALTER TABLE public.login_attempts 
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz;

-- Create advanced rate limit function with detailed response
CREATE OR REPLACE FUNCTION public.check_advanced_rate_limit(
  p_email text,
  p_ip_address text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count integer;
  v_blocked_until timestamptz;
  v_max_attempts integer := 5;
  v_window_minutes integer := 15;
  v_block_duration_minutes integer := 30;
BEGIN
  -- Check if user is currently blocked
  SELECT blocked_until INTO v_blocked_until
  FROM public.login_attempts
  WHERE email = p_email
    AND blocked_until IS NOT NULL
    AND blocked_until > now()
  ORDER BY blocked_until DESC
  LIMIT 1;
  
  IF v_blocked_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_blocked_until,
      'reason', 'Account temporarily blocked due to too many failed attempts'
    );
  END IF;

  -- Count failed attempts in window
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > now() - (v_window_minutes || ' minutes')::interval;
  
  -- If at max attempts, block the account
  IF v_attempt_count >= v_max_attempts THEN
    -- Record the block
    UPDATE public.login_attempts
    SET blocked_until = now() + (v_block_duration_minutes || ' minutes')::interval
    WHERE email = p_email
      AND attempted_at = (
        SELECT MAX(attempted_at) 
        FROM public.login_attempts 
        WHERE email = p_email
      );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', now() + (v_block_duration_minutes || ' minutes')::interval,
      'reason', 'Too many failed attempts. Please try again later.'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_max_attempts - v_attempt_count,
    'reset_at', now() + (v_window_minutes || ' minutes')::interval,
    'reason', null
  );
END;
$$;