-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Trigger function for invite code redemption notification
CREATE OR REPLACE FUNCTION public.notify_invite_redeemed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text;
BEGIN
  -- Only run when a connection is created (invitee -> inviter direction)
  -- Get the username of the new user
  SELECT username INTO v_username
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Notify the connected user (inviter) that someone joined
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.connected_user_id,
    'invite_joined',
    'New Connection!',
    COALESCE(v_username, 'Someone') || ' joined using your invite link',
    jsonb_build_object('joined_user_id', NEW.user_id, 'username', v_username)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on connections table
CREATE TRIGGER on_connection_created_notify
AFTER INSERT ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.notify_invite_redeemed();

-- Trigger function for group moment shared notification
CREATE OR REPLACE FUNCTION public.notify_group_moment_shared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sharer_username text;
  v_group_name text;
  v_member record;
BEGIN
  -- Get sharer's username
  SELECT username INTO v_sharer_username
  FROM public.profiles
  WHERE user_id = NEW.shared_by;
  
  -- Get group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;
  
  -- Notify all group members except the sharer
  FOR v_member IN 
    SELECT user_id FROM public.group_members 
    WHERE group_id = NEW.group_id AND user_id != NEW.shared_by AND status = 'accepted'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_member.user_id,
      'moment_shared',
      'New Moment Shared',
      COALESCE(v_sharer_username, 'Someone') || ' shared a moment in ' || COALESCE(v_group_name, 'a group'),
      jsonb_build_object(
        'group_id', NEW.group_id,
        'group_name', v_group_name,
        'sharer_id', NEW.shared_by,
        'sharer_username', v_sharer_username,
        'moment_id', NEW.id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on group_moments table
CREATE TRIGGER on_group_moment_shared_notify
AFTER INSERT ON public.group_moments
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_moment_shared();