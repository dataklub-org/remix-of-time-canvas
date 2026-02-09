-- Drop the duplicate trigger that's causing the double insert into baby_access
DROP TRIGGER IF EXISTS on_baby_created ON public.babies;
-- Keep only on_baby_created_add_parent