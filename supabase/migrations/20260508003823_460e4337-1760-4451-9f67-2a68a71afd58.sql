DROP POLICY IF EXISTS "Admins can insert gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Admins can update gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Admins can delete gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Content managers can insert gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Content managers can update gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Content managers can delete gallery items" ON public.gallery_items;

CREATE POLICY "Content managers can insert gallery items"
ON public.gallery_items FOR INSERT TO authenticated
WITH CHECK (public.is_content_admin(auth.uid()));

CREATE POLICY "Content managers can update gallery items"
ON public.gallery_items FOR UPDATE TO authenticated
USING (public.is_content_admin(auth.uid()))
WITH CHECK (public.is_content_admin(auth.uid()));

CREATE POLICY "Content managers can delete gallery items"
ON public.gallery_items FOR DELETE TO authenticated
USING (public.is_content_admin(auth.uid()));