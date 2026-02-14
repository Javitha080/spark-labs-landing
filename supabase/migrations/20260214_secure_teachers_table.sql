-- Secure teachers table by restricting write access to specific roles

-- Enable RLS (idempotent)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Teachers are insertable by authenticated users only." ON public.teachers;
DROP POLICY IF EXISTS "Teachers are updateable by authenticated users only." ON public.teachers;
DROP POLICY IF EXISTS "Teachers are deletable by authenticated users only." ON public.teachers;

-- Create strict policies using user_roles table
CREATE POLICY "Authorized users can insert teachers" ON public.teachers
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles 
            WHERE role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Authorized users can update teachers" ON public.teachers
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles 
            WHERE role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Authorized users can delete teachers" ON public.teachers
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles 
            WHERE role IN ('admin', 'editor')
        )
    );

-- Ensure public view policy remains (or recreate it to be safe)
DROP POLICY IF EXISTS "Public teachers are viewable by everyone." ON public.teachers;
CREATE POLICY "Public teachers are viewable by everyone." ON public.teachers
    FOR SELECT USING (true);
