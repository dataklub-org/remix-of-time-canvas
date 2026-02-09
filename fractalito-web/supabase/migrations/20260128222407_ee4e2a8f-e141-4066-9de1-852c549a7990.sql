-- Create a function to redeem an invite code (can be used by multiple users)
CREATE OR REPLACE FUNCTION public.redeem_invite_code(invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_user_id UUID;
  v_current_user_id UUID;
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
  
  -- Create bidirectional connections (ignore if already exists)
  INSERT INTO public.connections (user_id, connected_user_id)
  VALUES (v_current_user_id, v_inviter_user_id)
  ON CONFLICT ON CONSTRAINT connections_unique_pair DO NOTHING;
  
  INSERT INTO public.connections (user_id, connected_user_id)
  VALUES (v_inviter_user_id, v_current_user_id)
  ON CONFLICT ON CONSTRAINT connections_unique_pair DO NOTHING;
  
  RETURN TRUE;
END;
$$;