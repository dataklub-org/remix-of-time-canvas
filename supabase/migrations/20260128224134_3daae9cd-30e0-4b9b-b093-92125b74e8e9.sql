-- Add a color column to group_members for user-specific group colors
-- Each user can define their own color for each group they belong to
ALTER TABLE public.group_members
ADD COLUMN color TEXT DEFAULT NULL;

-- Allow users to update their own color preference
-- The existing UPDATE policy already allows users to update their own membership rows