-- Add GDPR consent tracking columns to enrollment_submissions table
ALTER TABLE public.enrollment_submissions 
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS privacy_policy_version text DEFAULT 'v1.0_2025-01-22';