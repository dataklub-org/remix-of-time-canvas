-- Add a color column to babies for visual customization
-- Only parents can update this (enforced via RLS - parents can update babies they have parent access to)
ALTER TABLE public.babies
ADD COLUMN color TEXT DEFAULT NULL;