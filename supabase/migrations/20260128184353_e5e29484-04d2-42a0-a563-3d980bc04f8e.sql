-- Create public_usernames table for username lookups only
CREATE TABLE public.public_usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_usernames ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view usernames (this is intentionally public for search)
CREATE POLICY "Authenticated users can view usernames"
ON public.public_usernames
FOR SELECT
TO authenticated
USING (true);

-- Users can only insert their own username
CREATE POLICY "Users can insert their own username"
ON public.public_usernames
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own username
CREATE POLICY "Users can update their own username"
ON public.public_usernames
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own username
CREATE POLICY "Users can delete their own username"
ON public.public_usernames
FOR DELETE
USING (auth.uid() = user_id);

-- Populate from existing profiles
INSERT INTO public.public_usernames (user_id, username)
SELECT user_id, username FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger to sync usernames when profiles are created/updated
CREATE OR REPLACE FUNCTION public.sync_public_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_usernames (user_id, username)
  VALUES (NEW.user_id, NEW.username)
  ON CONFLICT (user_id) DO UPDATE SET username = NEW.username;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_username_change
AFTER INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_username();

-- Make profiles table more restrictive - only viewable by self or connections
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view profiles of their connections"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE (connections.user_id = auth.uid() AND connections.connected_user_id = profiles.user_id)
       OR (connections.connected_user_id = auth.uid() AND connections.user_id = profiles.user_id)
  )
);

CREATE POLICY "Users can view profiles of group members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = profiles.user_id
      AND gm1.status = 'accepted'
      AND gm2.status = 'accepted'
  )
);