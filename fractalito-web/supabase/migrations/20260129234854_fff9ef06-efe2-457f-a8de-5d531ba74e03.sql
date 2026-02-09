-- Create role enum for baby access
CREATE TYPE public.baby_access_role AS ENUM ('parent', 'angel');

-- Create permission enum for angel access level
CREATE TYPE public.angel_permission AS ENUM ('view', 'contribute');

-- Create babies table
CREATE TABLE public.babies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  date_of_birth DATE NOT NULL,
  time_of_birth TIME,
  place_of_birth TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create baby_access table for sharing babies with other users
CREATE TABLE public.baby_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role baby_access_role NOT NULL DEFAULT 'parent',
  permission angel_permission,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(baby_id, user_id)
);

-- Create baby_moments table for moments shared to a baby's timeline
CREATE TABLE public.baby_moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  original_moment_id UUID REFERENCES public.moments(id) ON DELETE SET NULL,
  shared_by UUID NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  y_position DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  description TEXT NOT NULL,
  people TEXT,
  location TEXT,
  category category_type NOT NULL DEFAULT 'personal',
  memorable BOOLEAN DEFAULT false,
  photo_url TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baby_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baby_moments ENABLE ROW LEVEL SECURITY;

-- Function to check if user has access to a baby
CREATE OR REPLACE FUNCTION public.has_baby_access(_user_id UUID, _baby_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.baby_access
    WHERE user_id = _user_id 
    AND baby_id = _baby_id 
    AND status = 'accepted'
  )
$$;

-- Function to check if user can contribute to a baby
CREATE OR REPLACE FUNCTION public.can_contribute_to_baby(_user_id UUID, _baby_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.baby_access
    WHERE user_id = _user_id 
    AND baby_id = _baby_id 
    AND status = 'accepted'
    AND (role = 'parent' OR (role = 'angel' AND permission = 'contribute'))
  )
$$;

-- RLS Policies for babies table
CREATE POLICY "Users can view babies they have access to"
ON public.babies FOR SELECT
USING (has_baby_access(auth.uid(), id));

CREATE POLICY "Users can create babies"
ON public.babies FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Parents can update their babies"
ON public.babies FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.baby_access
  WHERE baby_id = babies.id
  AND user_id = auth.uid()
  AND role = 'parent'
  AND status = 'accepted'
));

CREATE POLICY "Creator can delete babies"
ON public.babies FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for baby_access table
CREATE POLICY "Users can view their own access and access for babies they parent"
ON public.baby_access FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.baby_access ba
    WHERE ba.baby_id = baby_access.baby_id
    AND ba.user_id = auth.uid()
    AND ba.role = 'parent'
    AND ba.status = 'accepted'
  )
);

CREATE POLICY "Parents can invite others"
ON public.baby_access FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.baby_access
    WHERE baby_id = baby_access.baby_id
    AND user_id = auth.uid()
    AND role = 'parent'
    AND status = 'accepted'
  )
);

CREATE POLICY "Users can accept/reject their invitations"
ON public.baby_access FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can revoke access"
ON public.baby_access FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.baby_access ba
    WHERE ba.baby_id = baby_access.baby_id
    AND ba.user_id = auth.uid()
    AND ba.role = 'parent'
    AND ba.status = 'accepted'
  )
);

-- RLS Policies for baby_moments table
CREATE POLICY "Users with access can view baby moments"
ON public.baby_moments FOR SELECT
USING (has_baby_access(auth.uid(), baby_id));

CREATE POLICY "Contributors can add baby moments"
ON public.baby_moments FOR INSERT
WITH CHECK (
  auth.uid() = shared_by
  AND can_contribute_to_baby(auth.uid(), baby_id)
);

CREATE POLICY "Sharer can update their moments"
ON public.baby_moments FOR UPDATE
USING (auth.uid() = shared_by);

CREATE POLICY "Sharer can delete their moments"
ON public.baby_moments FOR DELETE
USING (auth.uid() = shared_by);

-- Trigger to auto-add creator as parent
CREATE OR REPLACE FUNCTION public.add_creator_as_baby_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.baby_access (baby_id, user_id, role, status, invited_by)
  VALUES (NEW.id, NEW.created_by, 'parent', 'accepted', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_baby_created
AFTER INSERT ON public.babies
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_baby_parent();

-- Trigger for updated_at
CREATE TRIGGER update_babies_updated_at
BEFORE UPDATE ON public.babies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_baby_access_updated_at
BEFORE UPDATE ON public.baby_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();