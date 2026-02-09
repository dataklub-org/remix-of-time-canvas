-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_moments table (forked moments shared with groups)
CREATE TABLE public.group_moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  original_moment_id UUID REFERENCES public.moments(id) ON DELETE SET NULL,
  shared_by UUID NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Copied moment data (fork)
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
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_moments ENABLE ROW LEVEL SECURITY;

-- Helper function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Groups policies
CREATE POLICY "Users can view groups they are members of"
ON public.groups FOR SELECT
USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can update their groups"
ON public.groups FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Group creator can delete their groups"
ON public.groups FOR DELETE
USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Users can view members of groups they belong to"
ON public.group_members FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group creator can add members"
ON public.group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND created_by = auth.uid()
  )
  OR auth.uid() = user_id -- User can add themselves if invited
);

CREATE POLICY "Group creator can remove members"
ON public.group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND created_by = auth.uid()
  )
  OR auth.uid() = user_id -- Users can leave groups
);

-- Group moments policies
CREATE POLICY "Group members can view group moments"
ON public.group_moments FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can share moments"
ON public.group_moments FOR INSERT
WITH CHECK (
  public.is_group_member(auth.uid(), group_id) 
  AND auth.uid() = shared_by
);

CREATE POLICY "Sharer can update their shared moments"
ON public.group_moments FOR UPDATE
USING (auth.uid() = shared_by);

CREATE POLICY "Sharer can delete their shared moments"
ON public.group_moments FOR DELETE
USING (auth.uid() = shared_by);

-- Add triggers for updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();