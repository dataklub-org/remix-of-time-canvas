-- Drop the restrictive SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows authenticated users to view all profiles (for search/circle features)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Keep INSERT/UPDATE/DELETE restricted to own profile (already exists)