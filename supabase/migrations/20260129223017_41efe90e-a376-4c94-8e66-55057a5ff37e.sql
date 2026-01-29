-- Update redeem_invite_code to add inviter to new user's circle (one-way)
CREATE OR REPLACE FUNCTION public.redeem_invite_code(invite_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_user_id UUID;
  v_current_user_id UUID;
  v_current_username TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get the invite code details
  SELECT inviter_user_id INTO v_inviter_user_id
  FROM public.invite_codes
  WHERE code = invite_code
    AND (expires_at IS NULL OR expires_at > now());
  
  IF v_inviter_user_id IS NULL THEN
    RETURN FALSE; -- Invalid or expired code
  END IF;
  
  -- Don't allow self-invites
  IF v_inviter_user_id = v_current_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Get the username of the person who joined
  SELECT username INTO v_current_username
  FROM public.profiles
  WHERE user_id = v_current_user_id;
  
  -- Add inviter to new user's circle (one-way connection)
  INSERT INTO public.connections (user_id, connected_user_id)
  VALUES (v_current_user_id, v_inviter_user_id)
  ON CONFLICT ON CONSTRAINT connections_unique_pair DO NOTHING;
  
  -- Create notification for the inviter
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_inviter_user_id,
    'invite_joined',
    'New User Joined!',
    COALESCE(v_current_username, 'Someone') || ' joined using your invite link',
    jsonb_build_object(
      'joined_user_id', v_current_user_id,
      'username', v_current_username
    )
  );
  
  RETURN TRUE;
END;
$function$;