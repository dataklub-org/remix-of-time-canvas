-- Create a function to create bidirectional connections when an invite code is redeemed
CREATE OR REPLACE FUNCTION public.handle_invite_code_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only run when used_by_user_id changes from NULL to a value
  IF OLD.used_by_user_id IS NULL AND NEW.used_by_user_id IS NOT NULL THEN
    -- Create connection from new user to inviter (if not exists)
    INSERT INTO public.connections (user_id, connected_user_id)
    VALUES (NEW.used_by_user_id, NEW.inviter_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Create connection from inviter to new user (if not exists)
    INSERT INTO public.connections (user_id, connected_user_id)
    VALUES (NEW.inviter_user_id, NEW.used_by_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically create connections when invite code is redeemed
DROP TRIGGER IF EXISTS on_invite_code_redeemed ON public.invite_codes;
CREATE TRIGGER on_invite_code_redeemed
  AFTER UPDATE ON public.invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invite_code_redemption();

-- Add unique constraint to connections to prevent duplicates
ALTER TABLE public.connections 
ADD CONSTRAINT connections_unique_pair UNIQUE (user_id, connected_user_id);

-- Create a function to delete all user data (called by the user themselves)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete all moments from user's timelines
  DELETE FROM public.moments WHERE user_id = current_user_id;
  
  -- Delete group moments shared by this user
  DELETE FROM public.group_moments WHERE shared_by = current_user_id;
  
  -- Delete from group_members
  DELETE FROM public.group_members WHERE user_id = current_user_id;
  
  -- Delete groups created by this user (this will cascade to group_members due to FK)
  DELETE FROM public.groups WHERE created_by = current_user_id;
  
  -- Delete connections
  DELETE FROM public.connections WHERE user_id = current_user_id OR connected_user_id = current_user_id;
  
  -- Delete invite codes
  DELETE FROM public.invite_codes WHERE inviter_user_id = current_user_id;
  
  -- Delete timelines
  DELETE FROM public.timelines WHERE user_id = current_user_id;
  
  -- Delete public_usernames
  DELETE FROM public.public_usernames WHERE user_id = current_user_id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = current_user_id;
  
  -- Finally, delete the auth user (this must be done via Supabase Admin API or service role)
  -- The actual auth.users deletion will be handled by the client calling supabase.auth.admin.deleteUser
  -- or by signing out and having the user re-register
END;
$function$;