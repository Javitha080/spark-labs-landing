-- Fix two bugs in check_enrollment_rate_limit:
-- 1. p_ip_address defaults to NULL but ip_address column is NOT NULL → INSERT fails silently
-- 2. submission_count never resets after the 1-hour window expires

-- First, add a default and backfill any NULL ip_address values
ALTER TABLE public.enrollment_rate_limits ALTER COLUMN ip_address SET DEFAULT 'unknown';
UPDATE public.enrollment_rate_limits SET ip_address = 'unknown' WHERE ip_address IS NULL;

-- Replace the function with fixed version
CREATE OR REPLACE FUNCTION public.check_enrollment_rate_limit(
  p_email text,
  p_ip_address text DEFAULT 'unknown'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_last_submission timestamp with time zone;
BEGIN
  -- Check submissions in last hour
  SELECT submission_count, last_submission_at
  INTO v_count, v_last_submission
  FROM public.enrollment_rate_limits
  WHERE email = p_email
    AND last_submission_at > now() - interval '1 hour';

  -- Allow max 3 submissions per hour
  IF v_count >= 3 THEN
    RETURN false;
  END IF;

  -- Upsert: reset count if window expired, else increment
  INSERT INTO public.enrollment_rate_limits (email, ip_address, submission_count, last_submission_at)
  VALUES (p_email, COALESCE(p_ip_address, 'unknown'), 1, now())
  ON CONFLICT (email)
  DO UPDATE SET
    submission_count = CASE
      WHEN enrollment_rate_limits.last_submission_at <= now() - interval '1 hour' THEN 1
      ELSE enrollment_rate_limits.submission_count + 1
    END,
    ip_address = COALESCE(EXCLUDED.ip_address, enrollment_rate_limits.ip_address),
    last_submission_at = now();

  RETURN true;
END;
$$;
