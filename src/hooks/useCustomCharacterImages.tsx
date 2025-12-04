import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CHARACTER_STAGES } from '@/lib/constants';
import { getCharacterImagePath } from '@/lib/character';

interface CustomCharacterImage {
  id: string;
  user_id: string;
  stage: number;
  image_url: string;
}

export function useCustomCharacterImages() {
  const { user } = useAuth();
  const [customImages, setCustomImages] = useState<CustomCharacterImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<number | null>(null);

  // Fetch custom images for the current user
  const fetchCustomImages = useCallback(async () => {
    if (!user?.id) {
      setCustomImages([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_character_images')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setCustomImages((data as CustomCharacterImage[]) || []);
    } catch (error) {
      console.error('Error fetching custom character images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCustomImages();
  }, [fetchCustomImages]);

  // Get custom image URL for a specific stage (or null if using default)
  const getCustomImageUrl = useCallback((stage: number): string | null => {
    const customImage = customImages.find(img => img.stage === stage);
    return customImage?.image_url || null;
  }, [customImages]);

  // Get the final image path (custom or default)
  const getImagePath = useCallback((gender: 'male' | 'female' | 'other', stage: number): string => {
    const customUrl = getCustomImageUrl(stage);
    return getCharacterImagePath(gender, stage, customUrl);
  }, [getCustomImageUrl]);

  // Upload custom image for a stage
  const uploadCustomImage = async (stage: number, file: File): Promise<boolean> => {
    if (!user?.id) return false;

    setIsUploading(stage);

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large (max 5MB)');
      }

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `stage_${stage.toString().padStart(3, '0')}.${fileExt}`;
      const filePath = `custom-stages/${user.id}/${fileName}`;

      // Delete existing file if any
      await supabase.storage
        .from('character-images')
        .remove([filePath]);

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(filePath);

      // Upsert database record
      const { error: dbError } = await supabase
        .from('user_character_images')
        .upsert({
          user_id: user.id,
          stage,
          image_url: publicUrl,
        }, { onConflict: 'user_id,stage' });

      if (dbError) throw dbError;

      // Refresh custom images
      await fetchCustomImages();
      return true;
    } catch (error) {
      console.error('Error uploading custom character image:', error);
      return false;
    } finally {
      setIsUploading(null);
    }
  };

  // Delete custom image for a stage (revert to default)
  const deleteCustomImage = async (stage: number): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Find the custom image record
      const customImage = customImages.find(img => img.stage === stage);
      if (!customImage) return true;

      // Delete from storage
      const fileName = `stage_${stage.toString().padStart(3, '0')}`;
      const { data: files } = await supabase.storage
        .from('character-images')
        .list(`custom-stages/${user.id}`);

      const fileToDelete = files?.find(f => f.name.startsWith(fileName));
      if (fileToDelete) {
        await supabase.storage
          .from('character-images')
          .remove([`custom-stages/${user.id}/${fileToDelete.name}`]);
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('user_character_images')
        .delete()
        .eq('user_id', user.id)
        .eq('stage', stage);

      if (dbError) throw dbError;

      // Refresh custom images
      await fetchCustomImages();
      return true;
    } catch (error) {
      console.error('Error deleting custom character image:', error);
      return false;
    }
  };

  // Check if a stage has a custom image
  const hasCustomImage = useCallback((stage: number): boolean => {
    return customImages.some(img => img.stage === stage);
  }, [customImages]);

  return {
    customImages,
    isLoading,
    isUploading,
    getCustomImageUrl,
    getImagePath,
    uploadCustomImage,
    deleteCustomImage,
    hasCustomImage,
    allStages: CHARACTER_STAGES,
    refetch: fetchCustomImages,
  };
}
