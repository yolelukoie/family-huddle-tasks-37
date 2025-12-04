-- Create table for user custom character stage images
CREATE TABLE public.user_character_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, stage)
);

-- Enable RLS
ALTER TABLE public.user_character_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own custom images
CREATE POLICY "Users can view their own custom images"
  ON public.user_character_images FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own custom images
CREATE POLICY "Users can insert their own custom images"
  ON public.user_character_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom images
CREATE POLICY "Users can update their own custom images"
  ON public.user_character_images FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own custom images
CREATE POLICY "Users can delete their own custom images"
  ON public.user_character_images FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_character_images_updated_at
  BEFORE UPDATE ON public.user_character_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add storage policy for custom character images folder
CREATE POLICY "Users can upload their own custom stage images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'character-images' 
    AND (storage.foldername(name))[1] = 'custom-stages'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update their own custom stage images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'character-images' 
    AND (storage.foldername(name))[1] = 'custom-stages'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own custom stage images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'character-images' 
    AND (storage.foldername(name))[1] = 'custom-stages'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Custom stage images are publicly readable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'character-images' 
    AND (storage.foldername(name))[1] = 'custom-stages'
  );