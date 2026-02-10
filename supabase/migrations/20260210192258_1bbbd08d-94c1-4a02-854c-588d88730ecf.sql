
DROP POLICY IF EXISTS "Users can view own or admins view all" ON profiles;
CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
