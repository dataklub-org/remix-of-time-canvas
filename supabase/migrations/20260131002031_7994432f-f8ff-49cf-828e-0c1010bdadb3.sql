-- Update redeem_group_invite_code to only notify the inviter (not all group members)
CREATE OR REPLACE FUNCTION public.redeem_group_invite_code(invite_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_user_id UUID;
  v_group_id UUID;
  v_group_name TEXT;
  v_inviter_username TEXT;
  v_current_user_id UUID;
  v_current_username TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get the invite code details
  SELECT gic.inviter_user_id, gic.group_id, g.name
  INTO v_inviter_user_id, v_group_id, v_group_name
  FROM public.group_invite_codes gic
  JOIN public.groups g ON g.id = gic.group_id
  WHERE gic.code = invite_code
    AND (gic.expires_at IS NULL OR gic.expires_at > now());
  
  IF v_group_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_inviter_user_id = v_current_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Get usernames
  SELECT username INTO v_current_username
  FROM public.profiles WHERE user_id = v_current_user_id;
  
  SELECT username INTO v_inviter_username
  FROM public.profiles WHERE user_id = v_inviter_user_id;
  
  -- Add inviter to new user's circle (one-way connection)
  INSERT INTO public.connections (user_id, connected_user_id)
  VALUES (v_current_user_id, v_inviter_user_id)
  ON CONFLICT ON CONSTRAINT connections_unique_pair DO NOTHING;
  
  -- Only notify the INVITER (not all group members)
  -- Include group info so they can add the new user to the group
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_inviter_user_id,
    'group_invite_used',
    'New user via your invite!',
    '@' || COALESCE(v_current_username, 'Someone') || ' joined via your invite link for "' || v_group_name || '"',
    jsonb_build_object(
      'joined_user_id', v_current_user_id,
      'username', v_current_username,
      'group_id', v_group_id,
      'group_name', v_group_name
    )
  );
  
  -- Create notification for the new user
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_current_user_id,
    'welcome_via_invite',
    'Welcome to Fractalito!',
    'You joined via a link from @' || COALESCE(v_inviter_username, 'someone') || ' - they''re now in your Circle',
    jsonb_build_object(
      'inviter_user_id', v_inviter_user_id,
      'inviter_username', v_inviter_username,
      'group_id', v_group_id,
      'group_name', v_group_name
    )
  );
  
  RETURN TRUE;
END;
$function$;

-- Create trigger to notify group members when a new member is added
CREATE OR REPLACE FUNCTION public.notify_group_member_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_member_username TEXT;
  v_group_name TEXT;
  v_member RECORD;
BEGIN
  -- Only notify when status is 'accepted' (not for pending invites)
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;
  
  -- Get new member's username
  SELECT username INTO v_new_member_username
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Get group name
  SELECT name INTO v_group_name
  FROM public.groups WHERE id = NEW.group_id;
  
  -- Notify all OTHER group members (not the new member themselves)
  FOR v_member IN 
    SELECT user_id FROM public.group_members 
    WHERE group_id = NEW.group_id 
      AND user_id != NEW.user_id 
      AND status = 'accepted'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_member.user_id,
      'group_member_added',
      'New group member',
      '@' || COALESCE(v_new_member_username, 'Someone') || ' joined "' || COALESCE(v_group_name, 'the group') || '"',
      jsonb_build_object(
        'new_member_user_id', NEW.user_id,
        'new_member_username', v_new_member_username,
        'group_id', NEW.group_id,
        'group_name', v_group_name
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_group_member_added ON public.group_members;
CREATE TRIGGER on_group_member_added
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_group_member_added();