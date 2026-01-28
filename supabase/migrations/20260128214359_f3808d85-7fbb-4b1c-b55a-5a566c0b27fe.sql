-- Create invite_codes table for referral/invite links
CREATE TABLE public.invite_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  inviter_user_id uuid NOT NULL,
  used_by_user_id uuid,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own invite codes
CREATE POLICY "Users can view their own invite codes"
ON public.invite_codes FOR SELECT
USING (auth.uid() = inviter_user_id);

-- Users can create their own invite codes
CREATE POLICY "Users can create their own invite codes"
ON public.invite_codes FOR INSERT
WITH CHECK (auth.uid() = inviter_user_id);

-- Users can delete their own unused invite codes
CREATE POLICY "Users can delete their own unused invite codes"
ON public.invite_codes FOR DELETE
USING (auth.uid() = inviter_user_id AND used_by_user_id IS NULL);

-- Anyone authenticated can read invite code to validate during signup (by code, not user)
CREATE POLICY "Authenticated users can validate invite codes"
ON public.invite_codes FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can update invite codes when redeeming them
CREATE POLICY "Users can redeem invite codes"
ON public.invite_codes FOR UPDATE
USING (used_by_user_id IS NULL)
WITH CHECK (auth.uid() = used_by_user_id);

-- Create index for faster code lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);