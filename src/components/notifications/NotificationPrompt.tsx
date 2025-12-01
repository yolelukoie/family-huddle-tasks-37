import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requestAndSaveFcmToken } from '@/lib/fcm';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function NotificationPrompt() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const checkPermission = () => {
      if (!user?.id || dismissed) return;
      
      // Only show if permission is default (not yet asked)
      if ('Notification' in window && Notification.permission === 'default') {
        setShow(true);
      }
    };

    checkPermission();
  }, [user?.id, dismissed]);

  const handleEnable = async () => {
    if (!user?.id) return;
    const { success, error } = await requestAndSaveFcmToken(user.id);
    if (success) {
      setShow(false);
      toast.success(t('notifications.enabled') || 'Notifications enabled successfully');
    } else {
      toast.error(error || t('notifications.enableFailed') || 'Failed to enable notifications');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
  };

  if (!show) return null;

  return (
    <Card className="mx-4 mb-4 border-primary/20 bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              {t('notifications.enableTitle') || 'Enable Push Notifications'}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('notifications.enableDesc') || 'Get notified when family members assign tasks or send messages'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="theme" onClick={handleEnable}>
                <Bell className="h-3 w-3 mr-1" />
                {t('notifications.enable') || 'Enable'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                {t('notifications.later') || 'Maybe Later'}
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
