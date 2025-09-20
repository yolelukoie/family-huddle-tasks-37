-- Create storage bucket for character images
INSERT INTO storage.buckets (id, name, public) VALUES ('character-images', 'character-images', true);

-- Create policies for character images bucket
CREATE POLICY "Character images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'character-images');

CREATE POLICY "Service role can manage character images" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'character-images');