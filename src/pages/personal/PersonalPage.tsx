import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Edit, Settings, Upload, Loader2, Languages, Palette } from 'lucide-react';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { useToast } from '@/hooks/use-toast';
import { LEMON_CHECKOUT_URL } from '@/config/subscription';
import { supabase } from '@/integrations/supabase/client';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ru', name: 'Русский' },
  { code: 'he', name: 'עברית' },
];

export default function PersonalPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's saved language preference
  useEffect(() => {
    const loadLanguagePreference = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();

      if (data?.preferred_language && !error) {
        setSelectedLanguage(data.preferred_language);
        await i18n.changeLanguage(data.preferred_language);
      }
    };

    loadLanguagePreference();
  }, [user?.id]);

  if (!user) return null;

  const handleUpdateDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim() && newDisplayName !== user.displayName) {
      updateUser({ displayName: newDisplayName.trim() });
      toast({
        title: t('personal.profileUpdated'),
        description: t('personal.profileUpdatedDesc'),
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
        title: t('personal.invalidFileType'),
        description: t('personal.invalidFileTypeDesc'),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('personal.fileTooLarge'),
        description: t('personal.fileTooLargeDesc'),
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
        title: t('personal.avatarUpdated'),
        description: t('personal.avatarUpdatedDesc'),
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: t('personal.uploadFailed'),
        description: t('personal.uploadFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    await i18n.changeLanguage(language);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t('personal.languageUpdated'),
        description: t('personal.languageUpdatedDesc'),
      });
    } catch (error) {
      console.error('Error updating language:', error);
      toast({
        title: t('personal.updateFailed'),
        description: t('personal.updateFailedDesc'),
        variant: "destructive",
      });
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
      <NavigationHeader title={t('personal.title')} showBackButton />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Avatar Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('personal.profilePicture')}
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
              {isUploadingAvatar ? t('personal.uploading') : t('personal.uploadPhoto')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('personal.uploadHint')}
            </p>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t('personal.userProfile')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateDisplayName} className="space-y-4">
              <div>
                <Label htmlFor="displayName">{t('personal.displayName')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder={t('personal.displayNamePlaceholder')}
                  />
                  <Button type="submit" variant="outline">
                    {t('personal.update')}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Language Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t('personal.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="language">{t('personal.preferredLanguage')}</Label>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language">
                  <SelectValue placeholder={t('personal.selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Theme Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('personal.theme')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('personal.subscription')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('personal.subscriptionDesc')}
            </p>
            <Button 
              variant="secondary" 
              onClick={() => window.location.href = LEMON_CHECKOUT_URL}
            >
              {t('personal.manageSubscription')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
