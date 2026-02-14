-- Create Enrollments Table
CREATE TABLE IF NOT EXISTS public.learning_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.learning_courses(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ,
    progress INTEGER DEFAULT 0, -- 0 to 100 percentage
    UNIQUE(user_id, course_id)
);

-- Enable RLS for Enrollments
ALTER TABLE public.learning_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollments" 
ON public.learning_enrollments FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves" 
ON public.learning_enrollments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.learning_enrollments FOR UPDATE 
USING (auth.uid() = user_id);

-- Create Progress Tracking Table (Module level)
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.learning_courses(id) ON DELETE CASCADE NOT NULL,
    module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    last_position INTEGER DEFAULT 0, -- In seconds, for video resume
    UNIQUE(user_id, module_id)
);

-- Enable RLS for Progress
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" 
ON public.learning_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can track their own progress" 
ON public.learning_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.learning_progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_enrollments_user ON public.learning_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON public.learning_enrollments(course_id);
CREATE INDEX idx_progress_user_course ON public.learning_progress(user_id, course_id);
