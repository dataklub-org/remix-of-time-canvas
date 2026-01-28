-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view usernames" ON public.public_usernames;

-- Create a more restrictive policy: users can only view usernames of their connections
CREATE POLICY "Users can view usernames of connections"
ON public.public_usernames
FOR SELECT
USING (
  -- Can view own username
  auth.uid() = user_id
  OR
  -- Can view usernames of connected users
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE connections.user_id = auth.uid()
    AND connections.connected_user_id = public_usernames.user_id
  )
);

-- Create a secure function for exact username lookup (for search/add connection feature)
-- This prevents bulk enumeration while allowing exact match searches
CREATE OR REPLACE FUNCTION public.lookup_username_exact(search_username TEXT)
RETURNS TABLE(user_id UUID, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return if there's an exact case-insensitive match
  -- This prevents enumeration while allowing the search feature to work
  RETURN QUERY
  SELECT pu.user_id, pu.username
  FROM public.public_usernames pu
  WHERE LOWER(pu.username) = LOWER(search_username)
  LIMIT 1;
END;
$$;