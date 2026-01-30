-- Fix baby_access RLS policies that cause infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own access and access for babies they pare" ON public.baby_access;
DROP POLICY IF EXISTS "Parents can invite others" ON public.baby_access;

-- Recreate SELECT policy without recursion - check own records OR use SECURITY DEFINER function
CREATE POLICY "Users can view baby access records"
  ON public.baby_access
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR auth.uid() = invited_by
    OR can_contribute_to_baby(auth.uid(), baby_id)
  );

-- Fix INSERT policy - use SECURITY DEFINER function instead of self-referencing subquery
CREATE POLICY "Parents can invite others"
  ON public.baby_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = invited_by 
    AND can_contribute_to_baby(auth.uid(), baby_id)
  );

-- Also fix babies INSERT policy to explicitly target authenticated users
DROP POLICY IF EXISTS "Users can create babies" ON public.babies;
CREATE POLICY "Users can create babies"
  ON public.babies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);