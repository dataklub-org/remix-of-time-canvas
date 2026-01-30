-- Fix the chicken-and-egg problem: when creating a baby, the trigger needs to insert into baby_access
-- but the user isn't a parent yet. We need to allow the trigger (SECURITY DEFINER) to work.

-- The trigger function add_creator_as_baby_parent already has SECURITY DEFINER which bypasses RLS.
-- But we also need to allow parents to invite others AFTER they exist in baby_access.

-- Drop and recreate the INSERT policy to handle both cases:
-- 1. Self-insert (for trigger creating parent record) - invited_by = user_id means creating own access
-- 2. Parent inviting others - use can_contribute_to_baby

DROP POLICY IF EXISTS "Parents can invite others" ON public.baby_access;

CREATE POLICY "Allow baby access inserts"
  ON public.baby_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = invited_by 
    AND (
      -- Allow self-insert (when user is being added as parent by trigger, user_id = invited_by)
      auth.uid() = user_id
      -- OR user is already a parent/contributor for this baby
      OR can_contribute_to_baby(auth.uid(), baby_id)
    )
  );