
-- Allow admins to delete learning progress (for reset progress feature)
CREATE POLICY "Admins can delete progress"
ON public.learning_progress
FOR DELETE
TO authenticated
USING (auth.uid() IN (
  SELECT user_roles.user_id FROM user_roles
  WHERE user_roles.role = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'coordinator'::app_role])
));
