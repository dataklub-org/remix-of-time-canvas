-- Create the trigger that adds the creator as a parent (the function exists but trigger was missing)
CREATE TRIGGER on_baby_created_add_parent
  AFTER INSERT ON public.babies
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_baby_parent();