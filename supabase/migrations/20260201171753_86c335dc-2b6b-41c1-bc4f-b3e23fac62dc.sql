-- Add length constraints to text fields for security

-- Moments table
ALTER TABLE public.moments
ADD CONSTRAINT moments_description_length CHECK (char_length(description) <= 5000),
ADD CONSTRAINT moments_location_length CHECK (location IS NULL OR char_length(location) <= 500),
ADD CONSTRAINT moments_people_length CHECK (people IS NULL OR char_length(people) <= 1000);

-- Group moments table
ALTER TABLE public.group_moments
ADD CONSTRAINT gm_description_length CHECK (char_length(description) <= 5000),
ADD CONSTRAINT gm_location_length CHECK (location IS NULL OR char_length(location) <= 500),
ADD CONSTRAINT gm_people_length CHECK (people IS NULL OR char_length(people) <= 1000);

-- Baby moments table  
ALTER TABLE public.baby_moments
ADD CONSTRAINT bm_description_length CHECK (char_length(description) <= 5000),
ADD CONSTRAINT bm_location_length CHECK (location IS NULL OR char_length(location) <= 500),
ADD CONSTRAINT bm_people_length CHECK (people IS NULL OR char_length(people) <= 1000);

-- Profiles table
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 100),
ADD CONSTRAINT profiles_username_length CHECK (char_length(username) <= 50);

-- Groups table
ALTER TABLE public.groups
ADD CONSTRAINT groups_name_length CHECK (char_length(name) <= 100);

-- Babies table
ALTER TABLE public.babies
ADD CONSTRAINT babies_name_length CHECK (char_length(name) <= 100),
ADD CONSTRAINT babies_place_of_birth_length CHECK (place_of_birth IS NULL OR char_length(place_of_birth) <= 200),
ADD CONSTRAINT babies_username_length CHECK (char_length(username) <= 50);