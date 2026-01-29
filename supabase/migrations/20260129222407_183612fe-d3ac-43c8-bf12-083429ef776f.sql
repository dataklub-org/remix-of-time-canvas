-- Update redeem_invite_code to NOT create connections automatically
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
  
  -- Create notification for the inviter (no automatic connection)
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

-- Drop the old trigger that creates connections on invite_codes update
DROP TRIGGER IF EXISTS on_invite_code_redeemed ON public.invite_codes;

-- Drop the connection trigger that was creating notifications (we moved it to redeem_invite_code)
DROP TRIGGER IF EXISTS on_connection_created_notify ON public.connections;