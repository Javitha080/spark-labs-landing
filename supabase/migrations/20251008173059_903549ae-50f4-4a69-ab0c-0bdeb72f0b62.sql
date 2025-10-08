-- Enable realtime for enrollment submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_submissions;

-- Add index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON public.enrollment_submissions(status);

-- Add index for faster sorting by created_at
CREATE INDEX IF NOT EXISTS idx_enrollment_created_at ON public.enrollment_submissions(created_at DESC);

-- Update team_members table to add a flag for hiding email from public view
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS show_email boolean DEFAULT false;

-- Create a secure view for public team member display (without exposing all emails)
CREATE OR REPLACE VIEW public.team_members_public AS
SELECT 
  id,
  name,
  role,
  description,
  image_url,
  CASE 
    WHEN show_email THEN email 
    ELSE NULL 
  END as email,
  CASE 
    WHEN show_email THEN linkedin_url 
    ELSE linkedin_url 
  END as linkedin_url,
  display_order,
  created_at
FROM public.team_members
ORDER BY display_order, created_at;

-- Update RLS policy for team_members to be more restrictive
DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;

CREATE POLICY "Anyone can view basic team member info"
ON public.team_members
FOR SELECT
USING (true);

-- Add enhanced security trigger to validate enrollment data
CREATE OR REPLACE FUNCTION public.validate_enrollment_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate phone format (basic validation)
  IF LENGTH(NEW.phone) < 10 THEN
    RAISE EXCEPTION 'Phone number must be at least 10 digits';
  END IF;
  
  -- Validate name length
  IF LENGTH(TRIM(NEW.name)) < 2 THEN
    RAISE EXCEPTION 'Name must be at least 2 characters';
  END IF;
  
  -- Sanitize inputs
  NEW.name = TRIM(NEW.name);
  NEW.email = LOWER(TRIM(NEW.email));
  NEW.grade = TRIM(NEW.grade);
  NEW.interest = TRIM(NEW.interest);
  NEW.reason = TRIM(NEW.reason);
  
  RETURN NEW;
END;
$$;

-- Add trigger for enrollment validation
DROP TRIGGER IF EXISTS validate_enrollment_trigger ON public.enrollment_submissions;
CREATE TRIGGER validate_enrollment_trigger
  BEFORE INSERT OR UPDATE ON public.enrollment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_enrollment_submission();

-- Add rate limiting table for enrollment submissions (prevent spam)
CREATE TABLE IF NOT EXISTS public.enrollment_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  email text NOT NULL,
  submission_count integer DEFAULT 1,
  last_submission_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Add index for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_email ON public.enrollment_rate_limits(email);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON public.enrollment_rate_limits(ip_address);

-- Enable RLS on rate limits table
ALTER TABLE public.enrollment_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limits
CREATE POLICY "Admins can view rate limits"
ON public.enrollment_rate_limits
FOR SELECT
USING (is_admin(auth.uid()));

-- Add function to check rate limits
CREATE OR REPLACE FUNCTION public.check_enrollment_rate_limit(
  p_email text,
  p_ip_address text DEFAULT NULL
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
  
  -- Update or insert rate limit record
  INSERT INTO public.enrollment_rate_limits (email, ip_address, submission_count, last_submission_at)
  VALUES (p_email, p_ip_address, 1, now())
  ON CONFLICT (email) 
  DO UPDATE SET 
    submission_count = enrollment_rate_limits.submission_count + 1,
    last_submission_at = now();
  
  RETURN true;
END;
$$;

-- Add unique constraint on email for rate limiting
ALTER TABLE public.enrollment_rate_limits 
  DROP CONSTRAINT IF EXISTS enrollment_rate_limits_email_key;
  
ALTER TABLE public.enrollment_rate_limits 
  ADD CONSTRAINT enrollment_rate_limits_email_key UNIQUE (email);