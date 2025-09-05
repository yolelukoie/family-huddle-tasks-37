-- Enable Row Level Security on badges and character_stages tables
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_stages ENABLE ROW LEVEL SECURITY;

-- Create read-only policies for badges (reference data accessible to everyone)
CREATE POLICY "Badges are publicly readable" 
ON public.badges 
FOR SELECT 
USING (true);

-- Create read-only policies for character_stages (reference data accessible to everyone)
CREATE POLICY "Character stages are publicly readable" 
ON public.character_stages 
FOR SELECT 
USING (true);