-- Create a secure RPC to create babies server-side.
-- This avoids client-side RLS mismatches while still enforcing authentication.

CREATE OR REPLACE FUNCTION public.create_baby(
  p_name text,
  p_username text,
  p_date_of_birth date,
  p_time_of_birth time without time zone DEFAULT NULL,
  p_place_of_birth text DEFAULT NULL
)
RETURNS public.babies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_row public.babies;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.babies (
    created_by,
    name,
    username,
    date_of_birth,
    time_of_birth,
    place_of_birth
  )
  VALUES (
    v_user_id,
    p_name,
    lower(p_username),
    p_date_of_birth,
    p_time_of_birth,
    p_place_of_birth
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_baby(text, text, date, time without time zone, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_baby(text, text, date, time without time zone, text) TO authenticated;