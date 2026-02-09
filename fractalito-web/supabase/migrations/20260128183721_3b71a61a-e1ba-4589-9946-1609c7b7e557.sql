-- Add status column to group_members for invitation acceptance flow
ALTER TABLE public.group_members 
ADD COLUMN status TEXT NOT NULL DEFAULT 'accepted';

-- Update existing members to be accepted
UPDATE public.group_members SET status = 'accepted';

-- Create index for faster status queries
CREATE INDEX idx_group_members_status ON public.group_members(status);

-- Update RLS policy to allow users to update their own membership status
CREATE POLICY "Users can accept/reject their invitations"
ON public.group_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update the SELECT policy to also show pending invitations to the invited user
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.group_members;

CREATE POLICY "Users can view group members and their pending invitations"
ON public.group_members
FOR SELECT
USING (
  is_group_member(auth.uid(), group_id) 
  OR (auth.uid() = user_id)
);