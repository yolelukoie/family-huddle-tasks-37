-- Create badges reference table
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_path TEXT NOT NULL,
  unlock_stars INTEGER NOT NULL,
  stage INTEGER NOT NULL
);

-- Create character stages reference table  
CREATE TABLE IF NOT EXISTS public.character_stages (
  stage INTEGER PRIMARY KEY,
  required_stars INTEGER NOT NULL,
  name TEXT NOT NULL
);

-- Insert badge data
INSERT INTO public.badges (id, name, description, image_path, unlock_stars, stage) VALUES
('first-star', 'First Star', 'Earned your very first star!', '/lovable-uploads/005a577e-5920-44f1-8876-89e01675ad5c.png', 1, 1),
('early-achiever', 'Early Achiever', 'Completed 5 tasks already!', '/lovable-uploads/01f53541-5c59-48e9-b19c-cd1066d62356.png', 5, 1),
('task-master', 'Task Master', 'You''re getting good at this!', '/lovable-uploads/03fed6c5-25e4-4a07-9b9f-df555d8f325d.png', 10, 2),
('star-collector', 'Star Collector', 'Look at all those stars!', '/lovable-uploads/044ac21a-556d-4366-bcf5-4a5b29682f65.png', 25, 3),
('responsibility-champion', 'Responsibility Champion', 'Taking charge like a true leader!', '/lovable-uploads/058e2ce0-633d-4ad3-aeba-d61b6332aa19.png', 50, 4),
('family-hero', 'Family Hero', 'The family can always count on you!', '/lovable-uploads/0bd291fd-7bf1-4bb1-a9cc-1973757bf757.png', 100, 5),
('legendary-helper', 'Legendary Helper', 'You''ve become a legend in the family!', '/lovable-uploads/0bdb018c-d948-4714-954e-f5b2fc8689c5.png', 200, 6)
ON CONFLICT (id) DO NOTHING;

-- Insert character stages
INSERT INTO public.character_stages (stage, required_stars, name) VALUES
(1, 0, 'Getting Started'),
(2, 10, 'Helper'),
(3, 25, 'Team Player'),
(4, 50, 'Responsibility Champion'),  
(5, 100, 'Family Hero'),
(6, 200, 'Legendary Helper')
ON CONFLICT (stage) DO NOTHING;

-- Seed default house chores category and tasks for families
-- This will be used when families are created to populate default categories and tasks