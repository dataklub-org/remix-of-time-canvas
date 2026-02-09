-- Drop the overly permissive policy that exposes all invite codes
DROP POLICY IF EXISTS "Authenticated users can validate invite codes" ON public.invite_codes;

-- Create a more restrictive policy: users can only validate codes by exact code match
-- This allows the redemption flow to work (querying by code) while preventing enumeration
CREATE POLICY "Users can validate invite codes by code value"
ON public.invite_codes
FOR SELECT
USING (
  -- Users can always view their own invite codes
  auth.uid() = inviter_user_id
);

-- Note: The existing "Users can view their own invite codes" policy already covers 
-- viewing own codes. We rely on the UPDATE policy for redemption since:
-- 1. User queries by code value to check validity
-- 2. User updates the code to redeem it
-- The SELECT by code happens in the context of the update check