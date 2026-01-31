-- Fix the redeem_group_invite_code function to prevent duplicate notifications
-- Add idempotency check based on joined_user_id + group_id

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
  -- This prevents duplicate notifications if the function is called multiple times
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_inviter_user_id
      AND type = 'group_invite_used'
      AND data->>'joined_user_id' = v_current_user_id::text
      AND data->>'group_id' = v_group_id::text
  ) INTO v_already_notified;
  
  IF v_already_notified THEN
    RETURN TRUE; -- Already processed, return success but don't create duplicates
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

-- Update RLS policy for group_members to allow any group member to add new members (not just creator)
DROP POLICY IF EXISTS "Group creator can add members" ON public.group_members;
CREATE POLICY "Group members can add new members"
ON public.group_members
FOR INSERT
WITH CHECK (
  is_group_member(auth.uid(), group_id) OR (auth.uid() = user_id)
);