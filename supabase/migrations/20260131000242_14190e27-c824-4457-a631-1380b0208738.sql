-- Update redeem_group_invite_code to notify ALL group members about the new user
-- (not just the inviter)

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
  v_member RECORD;
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
    RETURN FALSE; -- Invalid or expired code
  END IF;
  
  -- Don't allow self-invites
  IF v_inviter_user_id = v_current_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Get usernames
  SELECT username INTO v_current_username
  FROM public.profiles WHERE user_id = v_current_user_id;
  
  SELECT username INTO v_inviter_username
  FROM public.profiles WHERE user_id = v_inviter_user_id;
  
  -- Add inviter to NEW USER's circle ONLY (one-way, new user gets the inviter)
  INSERT INTO public.connections (user_id, connected_user_id)
  VALUES (v_current_user_id, v_inviter_user_id)
  ON CONFLICT ON CONSTRAINT connections_unique_pair DO NOTHING;
  
  -- Notify ALL group members (not just the inviter) about who was invited by whom
  FOR v_member IN 
    SELECT user_id FROM public.group_members 
    WHERE group_id = v_group_id AND user_id != v_current_user_id AND status = 'accepted'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_member.user_id,
      'group_invite_used',
      'New user via group invite',
      '@' || COALESCE(v_current_username, 'Someone') || ' joined via @' || COALESCE(v_inviter_username, 'someone') || '''s invite link for "' || v_group_name || '"',
      jsonb_build_object(
        'joined_user_id', v_current_user_id,
        'username', v_current_username,
        'inviter_user_id', v_inviter_user_id,
        'inviter_username', v_inviter_username,
        'group_id', v_group_id,
        'group_name', v_group_name
      )
    );
  END LOOP;
  
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