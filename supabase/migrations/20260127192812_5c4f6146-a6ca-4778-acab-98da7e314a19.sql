-- Add username column to profiles with unique constraint
ALTER TABLE public.profiles 
ADD COLUMN username text;

-- Create unique index for username (case-insensitive)
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (LOWER(username));

-- Add check constraint for valid characters (alphanumeric and underscore only)
ALTER TABLE public.profiles 
ADD CONSTRAINT username_valid_chars 
CHECK (username ~ '^[a-zA-Z0-9_]+$');

-- Update existing profiles with email prefix from auth.users
UPDATE public.profiles p
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(u.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))
FROM auth.users u
WHERE p.user_id = u.id;

-- Make username NOT NULL after populating existing records
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL;

-- Update handle_new_user function to NOT auto-create profile (we'll do it during signup with username)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create default timeline only (profile will be created during signup with username)
  INSERT INTO public.timelines (user_id, name, type, is_default)
  VALUES (NEW.id, 'My Life', 'mylife', true);
  
  RETURN NEW;
END;
$function$;