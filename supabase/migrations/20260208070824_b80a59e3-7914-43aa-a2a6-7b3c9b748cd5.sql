
-- Create activity_log table for proper audit logging
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_email text,
  user_name text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  resource_name text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs
CREATE POLICY "Admins can view activity logs"
ON public.activity_log
FOR SELECT
USING (is_admin(auth.uid()) OR is_admin_role(auth.uid()));

-- System/service role can insert (via edge functions or triggers)
CREATE POLICY "Anyone can insert activity logs"
ON public.activity_log
FOR INSERT
WITH CHECK (true);

-- Add status column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Enable realtime on activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
