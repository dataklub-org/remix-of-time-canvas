-- Fix the redeem_group_invite_code function to ensure both notifications are created
-- and add explicit transaction handling

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
  v_already_notified BOOLEAN;
  v_connection_exists BOOLEAN;
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
  
  -- Check if we already sent a notification for this exact join event
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_inviter_user_id
      AND type = 'group_invite_used'
      AND (data->>'joined_user_id')::text = v_current_user_id::text
      AND (data->>'group_id')::text = v_group_id::text
  ) INTO v_already_notified;
  
  IF v_already_notified THEN
    RETURN TRUE;
  END IF;
  
  -- Get usernames
  SELECT username INTO v_current_username
  FROM public.profiles WHERE user_id = v_current_user_id;
  
  SELECT username INTO v_inviter_username
  FROM public.profiles WHERE user_id = v_inviter_user_id;
  
  -- Check if connection already exists
  SELECT EXISTS (
    SELECT 1 FROM public.connections 
    WHERE user_id = v_current_user_id AND connected_user_id = v_inviter_user_id
  ) INTO v_connection_exists;
  
  -- Add inviter to new user's circle (one-way connection) if not exists
  IF NOT v_connection_exists THEN
    INSERT INTO public.connections (user_id, connected_user_id)
    VALUES (v_current_user_id, v_inviter_user_id);
  END IF;
  
  -- FIRST: Create notification for the INVITER (group_invite_used)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_inviter_user_id,
    'group_invite_used',
    'New user via your invite!',
    '@' || COALESCE(v_current_username, 'Someone') || ' joined via your invite link for "' || v_group_name || '"',
    jsonb_build_object(
      'joined_user_id', v_current_user_id::text,
      'username', v_current_username,
      'group_id', v_group_id::text,
      'group_name', v_group_name
    )
  );
  
  -- SECOND: Create notification for the NEW USER (welcome_via_invite)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_current_user_id,
    'welcome_via_invite',
    'Welcome to Fractalito!',
    'You joined via a link from @' || COALESCE(v_inviter_username, 'someone') || ' - they''re now in your Circle',
    jsonb_build_object(
      'inviter_user_id', v_inviter_user_id::text,
      'inviter_username', v_inviter_username,
      'group_id', v_group_id::text,
      'group_name', v_group_name
    )
  );
  
  RETURN TRUE;
END;
$function$;