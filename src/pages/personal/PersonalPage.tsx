import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useBadges } from '@/hooks/useBadges';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Edit, Settings, Upload, Loader2, Languages, Palette, RotateCcw, Bell, BellOff, Trash2 } from 'lucide-react';
import { DeleteAccountModal } from '@/components/modals/DeleteAccountModal';
import { PushDebugCard } from '@/components/dev/PushDebugCard';
import { requestPushPermission, getPushPermissionStatus } from '@/lib/pushNotifications';
import { isPlatform, getCurrentPlatform } from '@/lib/platform';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { CharacterImageCustomizer } from '@/components/character/CharacterImageCustomizer';
import { useToast } from '@/hooks/use-toast';
import { initiateSubscription } from '@/config/subscription';
import { supabase } from '@/integrations/supabase/client';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
];

/** Open the OS notification settings for this app */
async function openAppNotificationSettings() {
  if (!isPlatform('capacitor')) return false;
  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import('capacitor-native-settings');
    const platform = getCurrentPlatform();
    if (platform === 'android') {
      await NativeSettings.openAndroid({ option: AndroidSettings.AppNotification });
    } else {
      await NativeSettings.openIOS({ option: IOSSettings.App });
    }
    return true;
  } catch (e) {
    console.error('[Settings] Failed to open native settings:', e);
    return false;
  }
}

/** Open battery optimization / autostart settings (Android only, best-effort) */
async function openBatterySettings() {
  if (!isPlatform('capacitor')) return false;
  try {
    const { NativeSettings, AndroidSettings } = await import('capacitor-native-settings');
    await NativeSettings.openAndroid({ option: AndroidSettings.BatteryOptimization });
    return true;
  } catch {
    return false;
  }
}

export default function PersonalPage() {
  const { user, updateUser } = useAuth();
  const { activeFamilyId, resetCharacterProgress } = useApp();
  const { resetBadgeProgress } = useBadges();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem('app-language') || i18n.language || 'en';
    } catch {
      return 'en';
    }
  });
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check notification permission status (platform-aware)
  useEffect(() => {
    getPushPermissionStatus().then(setNotificationPermission);
  }, []);

  // Load user's saved language preference and sync with cache
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
        try {
          localStorage.setItem('app-language', data.preferred_language);
        } catch (e) {
          console.warn('Failed to cache language preference:', e);
        }
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

    if (!file.type.startsWith('image/')) {
      toast({ title: t('personal.invalidFileType'), description: t('personal.invalidFileTypeDesc'), variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t('personal.fileTooLarge'), description: t('personal.fileTooLargeDesc'), variant: "destructive" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      await updateUser({ ...user, avatar_url: publicUrl } as any);
      toast({ title: t('personal.avatarUpdated'), description: t('personal.avatarUpdatedDesc') });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: t('personal.uploadFailed'), description: t('personal.uploadFailedDesc'), variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    await i18n.changeLanguage(language);
    try { localStorage.setItem('app-language', language); } catch {}
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: t('personal.languageUpdated'), description: t('personal.languageUpdatedDesc') });
    } catch (error) {
      console.error('Error updating language:', error);
      toast({ title: t('personal.updateFailed'), description: t('personal.updateFailedDesc'), variant: "destructive" });
    }
  };

  const handleResetCharacter = async () => {
    if (window.confirm(t('main.resetConfirm'))) {
      await resetCharacterProgress(activeFamilyId);
      resetBadgeProgress();
      toast({ title: t('personal.characterReset'), description: t('personal.characterResetDesc') });
    }
  };

  const handleEnableNotifications = async () => {
    if (!user?.id) return;

    // On native: always open OS notification settings so user can toggle
    if (isPlatform('capacitor')) {
      // First try to register (in case permission was granted externally)
      setIsEnablingNotifications(true);
      const { success } = await requestPushPermission(user.id);
      setIsEnablingNotifications(false);

      if (success) {
        const newStatus = await getPushPermissionStatus();
        setNotificationPermission(newStatus);
        if (newStatus === 'granted') {
          toast({
            title: t('notifications.enabled') || 'Notifications enabled',
            description: t('notifications.enabledDesc') || 'You will receive notifications',
          });
          return;
        }
      }

      // Open OS settings
      const opened = await openAppNotificationSettings();
      if (!opened) {
        toast({
          title: t('notifications.openSettings') || 'Open Settings',
          description: t('notifications.openSettingsDesc') || 'Please enable notifications in Settings > Apps > Family Huddle > Notifications',
        });
      }
      return;
    }
    
    // Web: if denied, show guidance
    if (notificationPermission === 'denied') {
      toast({
        title: t('notifications.blockedInBrowser') || 'Blocked in Browser',
        description: t('notifications.statusDeniedDesc') || 'Enable notifications in your browser settings',
      });
      return;
    }
    
    setIsEnablingNotifications(true);
    const { success, error } = await requestPushPermission(user.id);
    setIsEnablingNotifications(false);
    
    const newStatus = await getPushPermissionStatus();
    setNotificationPermission(newStatus);
    
    if (success) {
      toast({ title: t('notifications.enabled'), description: t('notifications.enabledDesc') });
    } else {
      toast({ title: t('notifications.error'), description: error || t('notifications.errorDesc'), variant: 'destructive' });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isNative = isPlatform('capacitor');
  // Treat 'unavailable' same as 'not enabled' — button should ALWAYS be active unless granted
  const isNotificationEnabled = notificationPermission === 'granted';

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
                <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <Button variant="theme" onClick={handleAvatarClick} disabled={isUploadingAvatar}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploadingAvatar ? t('personal.uploading') : t('personal.uploadPhoto')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">{t('personal.uploadHint')}</p>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t('personal.displayName')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateDisplayName} className="space-y-4">
              <div>
                <Label htmlFor="displayName">{t('personal.displayName')}</Label>
                <div className="flex gap-2">
                  <Input id="displayName" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder={t('personal.displayNamePlaceholder')} />
                  <Button type="submit" variant="theme">{t('personal.update')}</Button>
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
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
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

        {/* Character Image Customization */}
        <CharacterImageCustomizer />

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('notifications.title') || 'Notifications'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${
                  isNotificationEnabled ? 'bg-green-500/10' : 'bg-muted'
                }`}>
                  {isNotificationEnabled ? (
                    <Bell className="h-4 w-4 text-green-500" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">
                    {isNotificationEnabled
                      ? (t('notifications.statusEnabled') || 'Push notifications enabled')
                      : (t('notifications.statusDefault') || 'Push notifications not enabled')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isNotificationEnabled
                      ? (t('notifications.statusEnabledDesc') || 'You will receive task and message notifications')
                      : (t('notifications.statusDefaultDesc') || 'Enable to receive task assignments and messages')}
                  </p>
                </div>
              </div>
              
              {/* Button: ALWAYS active unless notifications are granted */}
              {isNotificationEnabled ? (
                // Granted: show "Manage in settings" on native
                isNative && (
                  <Button
                    variant="outline"
                    onClick={() => openAppNotificationSettings()}
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('notifications.manageInSettings') || 'Manage in Settings'}
                  </Button>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="theme"
                    onClick={handleEnableNotifications}
                    disabled={isEnablingNotifications}
                  >
                    {isEnablingNotifications ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('notifications.enabling') || 'Enabling...'}
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        {t('notifications.enable') || 'Enable Notifications'}
                      </>
                    )}
                  </Button>
                  
                  {/* Battery/Autostart shortcut for Android */}
                  {isNative && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const opened = await openBatterySettings();
                        if (!opened) {
                          toast({
                            title: t('notifications.batterySettings') || 'Battery Settings',
                            description: t('notifications.batterySettingsDesc') || 'Go to Settings > Battery > App battery usage > Family Huddle > No restrictions',
                          });
                        }
                      }}
                    >
                      {t('notifications.batteryOptimization') || 'Battery / Autostart Settings'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Push Debug (collapsible) */}
        <PushDebugCard />

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('personal.subscription')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{t('personal.subscriptionDesc')}</p>
            <Button variant="theme" onClick={() => user?.id && initiateSubscription(user.id)} disabled={!user?.id}>
              {t('personal.manageSubscription')}
            </Button>
          </CardContent>
        </Card>

        {/* Reset Character */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {t('personal.resetCharacter')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{t('personal.resetCharacterDesc')}</p>
            <Button onClick={handleResetCharacter} variant="destructive" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('personal.resetCharacter')}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account - Compact */}
        <Card className="border-destructive/30">
          <CardContent className="py-4 px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Trash2 className="h-4 w-4 text-destructive shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">{t('personal.deleteAccount')}</p>
                <p className="text-xs text-muted-foreground truncate">{t('personal.deleteAccountDesc')}</p>
              </div>
            </div>
            <DeleteAccountModal userId={user.id} />
          </CardContent>
        </Card>

        {/* Legal Links */}
        <div className="flex justify-center gap-4 text-sm text-muted-foreground py-4 flex-wrap">
          <a href="/privacy" className="hover:text-foreground transition-colors">{t('legal.privacyPolicy')}</a>
          <span>•</span>
          <a href="/terms" className="hover:text-foreground transition-colors">{t('legal.termsOfUse')}</a>
          <span>•</span>
          <a href="/refund" className="hover:text-foreground transition-colors">{t('legal.refundPolicy')}</a>
        </div>
      </div>
    </div>
  );
}
