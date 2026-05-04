-- Fix anonymous read access for public tables and views
DO $$ 
DECLARE
  t_name text;
  tables text[] := ARRAY[
    'team_members', 
    'team_members_public', 
    'projects', 
    'teachers', 
    'gallery_items', 
    'learning_courses', 
    'learning_workshops', 
    'learning_resources', 
    'blog_posts',
    'events',
    'schedule'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables LOOP
    -- Try to enable RLS (will fail silently if it's a view, which is fine)
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t_name);
    EXCEPTION WHEN others THEN
      -- Ignore errors (e.g., if it's a view)
    END;
    
    -- Drop existing policy if it exists
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous read access" ON public.%I;', t_name);
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
    
    -- Create the policy
    BEGIN
      EXECUTE format('CREATE POLICY "Allow anonymous read access" ON public.%I FOR SELECT TO anon USING (true);', t_name);
    EXCEPTION WHEN others THEN
      -- Ignore if table doesn't exist or if it's a view that doesn't support policies
    END;
  END LOOP;
END $$;
