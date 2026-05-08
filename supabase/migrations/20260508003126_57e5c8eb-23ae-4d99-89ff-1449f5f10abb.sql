DROP POLICY IF EXISTS "Authors can update own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Content managers can update any post" ON public.blog_posts;

CREATE POLICY "Authors can update own posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Content managers can update any post"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (public.is_content_admin(auth.uid()))
WITH CHECK (public.is_content_admin(auth.uid()));