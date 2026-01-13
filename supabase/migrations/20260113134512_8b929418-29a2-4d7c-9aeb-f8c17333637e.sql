-- Extend the app_role enum to include additional roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_creator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordinator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';