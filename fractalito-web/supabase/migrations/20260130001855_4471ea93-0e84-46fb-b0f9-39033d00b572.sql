-- Fix 1: Block direct notification inserts (triggers use SECURITY DEFINER and bypass RLS)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Block direct notification inserts"
ON public.notifications
FOR INSERT
WITH CHECK (false);

-- Fix 2: Create secure RPC function for invite code validation
-- This allows unauthenticated users to validate invite codes without exposing the table
CREATE OR REPLACE FUNCTION public.validate_invite_code(code_to_validate TEXT)
RETURNS TABLE(is_valid BOOLEAN, inviter_username TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (ic.expires_at IS NULL OR ic.expires_at > now()) as is_valid,
    p.username as inviter_username
  FROM public.invite_codes ic
  LEFT JOIN public.profiles p ON p.user_id = ic.inviter_user_id
  WHERE ic.code = code_to_validate
  LIMIT 1;
$$;