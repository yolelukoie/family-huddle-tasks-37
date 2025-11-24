import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Edit, Settings, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LEMON_CHECKOUT_URL } from '@/config/subscription';
import { supabase } from '@/integrations/supabase/client';

export default function PersonalPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleUpdateDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim() && newDisplayName !== user.displayName) {
      updateUser({ displayName: newDisplayName.trim() });
      toast({
        title: "Profile updated",
        description: "Your display name has been updated successfully.",
      });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(filePath);

      // Update user profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local user state
      await updateUser({ ...user, avatar_url: publicUrl } as any);

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Personal Settings" showBackButton />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Avatar Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={user.avatar_url} alt={user.displayName} />
                <AvatarFallback className="text-3xl">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Click the avatar or button to upload a new profile picture (max 5MB)
            </p>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateDisplayName} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                  <Button type="submit" variant="outline">
                    Update
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You're currently on a free trial. You can manage your subscription here.
            </p>
            <Button 
              variant="secondary" 
              onClick={() => window.location.href = LEMON_CHECKOUT_URL}
            >
              Manage subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
