-- Create enrollment_submissions table
CREATE TABLE public.enrollment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  interest TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'pending'
);

-- Enable Row Level Security
ALTER TABLE public.enrollment_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (submit enrollment)
CREATE POLICY "Anyone can submit enrollment"
ON public.enrollment_submissions
FOR INSERT
WITH CHECK (true);

-- Only admins can view enrollments
CREATE POLICY "Admins can view enrollments"
ON public.enrollment_submissions
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can update enrollments
CREATE POLICY "Admins can update enrollments"
ON public.enrollment_submissions
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete enrollments
CREATE POLICY "Admins can delete enrollments"
ON public.enrollment_submissions
FOR DELETE
USING (is_admin(auth.uid()));