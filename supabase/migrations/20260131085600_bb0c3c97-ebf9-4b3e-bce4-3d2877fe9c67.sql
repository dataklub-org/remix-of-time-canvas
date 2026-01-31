-- Update group member notifications to include inviter and avoid notifying the inviter

CREATE OR REPLACE FUNCTION public.notify_group_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_member_username text;
  v_group_name text;
  v_member record;
  v_inviter_user_id uuid;
  v_inviter_username text;
  v_message text;
BEGIN
  -- Only notify when status is 'accepted'
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Infer inviter from the existing group_invite_used notification
  SELECT n.user_id
  INTO v_inviter_user_id
  FROM public.notifications n
  WHERE n.type = 'group_invite_used'
    AND (n.data->>'joined_user_id') = NEW.user_id::text
    AND (n.data->>'group_id') = NEW.group_id::text
  ORDER BY n.created_at DESC
  LIMIT 1;

  -- Get new member's username
  SELECT username
  INTO v_new_member_username
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Get group name
  SELECT name
  INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;

  -- Get inviter username (if any)
  IF v_inviter_user_id IS NOT NULL THEN
    SELECT username
    INTO v_inviter_username
    FROM public.profiles
    WHERE user_id = v_inviter_user_id;
  END IF;

  v_message := '@' || COALESCE(v_new_member_username, 'Someone') || ' just joined "' || COALESCE(v_group_name, 'the group') || '"';
  IF v_inviter_username IS NOT NULL THEN
    v_message := v_message || '—invited by @' || v_inviter_username || '.';
  ELSE
    v_message := v_message || '.';
  END IF;

  -- Notify all OTHER accepted group members, excluding the new member and the inviter
  FOR v_member IN 
    SELECT user_id
    FROM public.group_members
    WHERE group_id = NEW.group_id
      AND status = 'accepted'
      AND user_id != NEW.user_id
      AND (v_inviter_user_id IS NULL OR user_id != v_inviter_user_id)
  LOOP
    -- Idempotency: avoid duplicates per recipient+event
    IF EXISTS (
      SELECT 1
      FROM public.notifications n2
      WHERE n2.user_id = v_member.user_id
        AND n2.type = 'group_member_added'
        AND (n2.data->>'new_member_user_id') = NEW.user_id::text
        AND (n2.data->>'group_id') = NEW.group_id::text
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_member.user_id,
      'group_member_added',
      'New group member',
      v_message,
      jsonb_build_object(
        'new_member_user_id', NEW.user_id,
        'new_member_username', v_new_member_username,
        'group_id', NEW.group_id,
        'group_name', v_group_name,
        'inviter_user_id', v_inviter_user_id,
        'inviter_username', v_inviter_username
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Recreate trigger to ensure it's bound to the updated function
DROP TRIGGER IF EXISTS on_group_member_added ON public.group_members;
CREATE TRIGGER on_group_member_added
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_group_member_added();
