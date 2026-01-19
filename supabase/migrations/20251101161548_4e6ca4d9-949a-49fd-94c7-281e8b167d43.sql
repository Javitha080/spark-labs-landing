-- Create flexible roles system
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system_role boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(resource, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create users management table (separate from profiles)
CREATE TABLE IF NOT EXISTS public.users_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create email notifications table for enrolled users
CREATE TABLE IF NOT EXISTS public.enrollment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.enrollment_submissions(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Create analytics tracking table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb,
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  page_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_management um
    JOIN public.role_permissions rp ON um.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE um.user_id = _user_id
      AND p.resource = _resource
      AND p.action = _action
  )
$$;

-- Create function to check if user is admin (backwards compatibility)
CREATE OR REPLACE FUNCTION public.is_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_management um
    JOIN public.roles r ON um.role_id = r.id
    WHERE um.user_id = _user_id
      AND r.name = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS Policies for roles table
CREATE POLICY "Admins can view all roles" ON public.roles
  FOR SELECT USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Admins can insert roles" ON public.roles
  FOR INSERT WITH CHECK (public.is_admin_role(auth.uid()));

CREATE POLICY "Admins can update non-system roles" ON public.roles
  FOR UPDATE USING (public.is_admin_role(auth.uid()) AND NOT is_system_role);

CREATE POLICY "Admins can delete non-system roles" ON public.roles
  FOR DELETE USING (public.is_admin_role(auth.uid()) AND NOT is_system_role);

-- RLS Policies for permissions table
CREATE POLICY "Admins can view all permissions" ON public.permissions
  FOR SELECT USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL USING (public.is_admin_role(auth.uid()));

-- RLS Policies for role_permissions table
CREATE POLICY "Admins can view role permissions" ON public.role_permissions
  FOR SELECT USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (public.is_admin_role(auth.uid()));

-- RLS Policies for users_management table
CREATE POLICY "Admins can view all users" ON public.users_management
  FOR SELECT USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Admins can manage users" ON public.users_management
  FOR ALL USING (public.is_admin_role(auth.uid()));

-- RLS Policies for enrollment_notifications table
CREATE POLICY "Admins can view notifications" ON public.enrollment_notifications
  FOR SELECT USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Admins can send notifications" ON public.enrollment_notifications
  FOR INSERT WITH CHECK (public.is_admin_role(auth.uid()));

-- RLS Policies for analytics_events table
CREATE POLICY "Admins can view analytics" ON public.analytics_events
  FOR SELECT USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Anyone can track analytics" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

-- Insert default system roles
INSERT INTO public.roles (name, description, is_system_role) VALUES
  ('admin', 'Full access to all features', true),
  ('editor', 'Can manage content but not users or roles', true),
  ('coordinator', 'Can manage events and enrollments', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO public.permissions (resource, action, description) VALUES
  ('users', 'view', 'View users'),
  ('users', 'create', 'Create users'),
  ('users', 'update', 'Update users'),
  ('users', 'delete', 'Delete users'),
  ('roles', 'view', 'View roles'),
  ('roles', 'create', 'Create roles'),
  ('roles', 'update', 'Update roles'),
  ('roles', 'delete', 'Delete roles'),
  ('events', 'view', 'View events'),
  ('events', 'create', 'Create events'),
  ('events', 'update', 'Update events'),
  ('events', 'delete', 'Delete events'),
  ('enrollments', 'view', 'View enrollments'),
  ('enrollments', 'update', 'Update enrollments'),
  ('enrollments', 'delete', 'Delete enrollments'),
  ('projects', 'view', 'View projects'),
  ('projects', 'create', 'Create projects'),
  ('projects', 'update', 'Update projects'),
  ('projects', 'delete', 'Delete projects'),
  ('gallery', 'view', 'View gallery'),
  ('gallery', 'create', 'Create gallery items'),
  ('gallery', 'update', 'Update gallery items'),
  ('gallery', 'delete', 'Delete gallery items'),
  ('team', 'view', 'View team members'),
  ('team', 'create', 'Create team members'),
  ('team', 'update', 'Update team members'),
  ('team', 'delete', 'Delete team members'),
  ('schedule', 'view', 'View schedule'),
  ('schedule', 'create', 'Create schedule'),
  ('schedule', 'update', 'Update schedule'),
  ('schedule', 'delete', 'Delete schedule'),
  ('analytics', 'view', 'View analytics'),
  ('notifications', 'send', 'Send notifications')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign permissions to editor role (content management only)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'editor'
  AND p.resource IN ('events', 'projects', 'gallery', 'team', 'schedule')
ON CONFLICT DO NOTHING;

-- Assign permissions to coordinator role (events and enrollments)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'coordinator'
  AND p.resource IN ('events', 'enrollments')
  AND p.action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- Create trigger for updating timestamps
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_management_updated_at
  BEFORE UPDATE ON public.users_management
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();