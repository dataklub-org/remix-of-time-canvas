-- Fix: Allow group creators to see their own groups (even before being added as members)
-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;

-- Create new SELECT policy that also allows creators to see their groups
CREATE POLICY "Users can view groups they created or are members of" 
ON public.groups 
FOR SELECT 
USING (
  auth.uid() = created_by OR is_group_member(auth.uid(), id)
);

-- Create a trigger to automatically add the creator as a member when a group is created
CREATE OR REPLACE FUNCTION public.add_creator_as_group_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_group_member();