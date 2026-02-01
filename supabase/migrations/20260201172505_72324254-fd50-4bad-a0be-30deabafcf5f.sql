-- Insert missing profiles for existing auth users
INSERT INTO public.profiles (user_id, username)
VALUES 
  ('c1004b5a-ef34-41b7-a134-aedcbed3cf86', 'sebastian_pinegger'),
  ('47935879-099f-4118-a164-74cba3b2d4ea', 'iris')
ON CONFLICT (user_id) DO NOTHING;

-- Insert into public_usernames for search functionality
INSERT INTO public.public_usernames (user_id, username)
VALUES 
  ('c1004b5a-ef34-41b7-a134-aedcbed3cf86', 'sebastian_pinegger'),
  ('47935879-099f-4118-a164-74cba3b2d4ea', 'iris')
ON CONFLICT (user_id) DO NOTHING;