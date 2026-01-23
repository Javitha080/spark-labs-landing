-- Add avatar_url to profiles for profile photos
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create user_sessions table to track active users
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (is_admin(auth.uid()));

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Anyone can insert their own session
CREATE POLICY "Users can create own session"
  ON public.user_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own session (for last_activity)
CREATE POLICY "Users can update own session"
  ON public.user_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can delete any session
CREATE POLICY "Admins can delete sessions"
  ON public.user_sessions FOR DELETE
  USING (is_admin(auth.uid()));

-- Create index for active session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
  ON public.user_sessions (is_active, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
  ON public.user_sessions (user_id);