-- Create table for group-specific invite codes
CREATE TABLE public.group_invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.group_invite_codes ENABLE ROW LEVEL SECURITY;

-- Policies for group invite codes
CREATE POLICY "Group members can view invite codes for their groups"
ON public.group_invite_codes
FOR SELECT
USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can create invite codes"
ON public.group_invite_codes
FOR INSERT
WITH CHECK (auth.uid() = inviter_user_id AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Inviter can delete their own codes"
ON public.group_invite_codes
FOR DELETE
USING (auth.uid() = inviter_user_id);

-- Function to validate a group invite code
CREATE OR REPLACE FUNCTION public.validate_group_invite_code(code_to_validate TEXT)
RETURNS TABLE(is_valid BOOLEAN, group_id UUID, group_name TEXT, inviter_username TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (gic.expires_at IS NULL OR gic.expires_at > now()) as is_valid,
    gic.group_id,
    g.name as group_name,
    p.username as inviter_username
  FROM public.group_invite_codes gic
  JOIN public.groups g ON g.id = gic.group_id
  LEFT JOIN public.profiles p ON p.user_id = gic.inviter_user_id
  WHERE gic.code = code_to_validate
  LIMIT 1;
$$;

-- Function to redeem a group invite code
CREATE OR REPLACE FUNCTION public.redeem_group_invite_code(invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inviter_user_id UUID;
  v_group_id UUID;
  v_group_name TEXT;
  v_inviter_username TEXT;
  v_current_user_id UUID;
  v_current_username TEXT;
  v_already_member BOOLEAN;
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
  
  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM public.group_members 
    WHERE group_id = v_group_id AND user_id = v_current_user_id
  ) INTO v_already_member;
  
  IF v_already_member THEN
    RETURN FALSE;
  END IF;
  
  -- Get usernames
  SELECT username INTO v_current_username
  FROM public.profiles WHERE user_id = v_current_user_id;
  
  SELECT username INTO v_inviter_username
  FROM public.profiles WHERE user_id = v_inviter_user_id;
  
  -- Add user to the group (directly accepted since they have invite code)
  INSERT INTO public.group_members (group_id, user_id, status)
  VALUES (v_group_id, v_current_user_id, 'accepted');
  
  -- Add inviter to new user's circle
  INSERT INTO public.connections (user_id, connected_user_id)
  VALUES (v_current_user_id, v_inviter_user_id)
  ON CONFLICT ON CONSTRAINT connections_unique_pair DO NOTHING;
  
  -- Add new user to inviter's circle
  INSERT INTO public.connections (user_id, connected_user_id)
  VALUES (v_inviter_user_id, v_current_user_id)
  ON CONFLICT ON CONSTRAINT connections_unique_pair DO NOTHING;
  
  -- Create notification for the inviter
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_inviter_user_id,
    'invite_joined',
    'New Group Member!',
    COALESCE(v_current_username, 'Someone') || ' joined "' || v_group_name || '" via your invite link',
    jsonb_build_object(
      'joined_user_id', v_current_user_id,
      'username', v_current_username,
      'group_id', v_group_id,
      'group_name', v_group_name
    )
  );
  
  -- Create welcome notification for the new user
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_current_user_id,
    'welcome_via_invite',
    'Welcome to ' || v_group_name || '!',
    'You joined via a link from @' || COALESCE(v_inviter_username, 'someone') || ' - you''re now connected',
    jsonb_build_object(
      'inviter_user_id', v_inviter_user_id,
      'inviter_username', v_inviter_username,
      'group_id', v_group_id,
      'group_name', v_group_name
    )
  );
  
  RETURN TRUE;
END;
$$;