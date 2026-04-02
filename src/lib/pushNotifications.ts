// Unified Push Notifications API — NATIVE ONLY (mobile-only policy)
// Web FCM registration is intentionally disabled to prevent duplicate notifications.

import { isPlatform } from './platform';
import { registerNativePush, listenNativePush, deleteNativePushToken } from './capacitorPush';
import { supabase } from '@/integrations/supabase/client';

/**
 * Request push notification permission and register token.
 * Only works on native (Capacitor). Web is a no-op.
 */
export async function requestPushPermission(userId: string): Promise<{ success: boolean; error?: string }> {
  if (isPlatform('capacitor')) {
    console.log('[Push] Using native push (Capacitor)');

    // One-time cleanup: delete any legacy web tokens for this user
    cleanupWebTokens(userId);

    return registerNativePush(userId);
  }

  // Web: intentionally disabled to prevent duplicate notifications
  console.log('[Push] Web push disabled (mobile-only policy)');
  return { success: false, error: 'Push notifications are only available on the mobile app' };
}

/**
 * Listen for foreground push notifications.
 * Only works on native. Web returns null.
 */
export async function listenForPushNotifications(
  onNotification: (payload: any) => void
): Promise<(() => void) | null> {
  if (isPlatform('capacitor')) {
    console.log('[Push] Setting up native foreground listener');
    return listenNativePush(onNotification);
  }
  // Web: no-op
  return null;
}

/**
 * Delete push token on logout.
 */
export async function deletePushToken(userId: string): Promise<void> {
  if (isPlatform('capacitor')) {
    await deleteNativePushToken(userId);
  }
  // Web: nothing to delete
}


/**
 * Check current push notification permission status.
 */
export async function getPushPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
  if (isPlatform('capacitor')) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const status = await PushNotifications.checkPermissions();
      console.log('[Push] Native permission status:', status.receive);
      if (status.receive === 'granted') return 'granted';
      if (status.receive === 'denied') return 'denied';
      // Treat 'prompt', 'prompt-with-rationale', 'unavailable' as 'prompt'
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  // Web: always unavailable under mobile-only policy
  return 'unavailable';
}

/**
 * One-time cleanup of legacy web tokens for this user.
 * Runs in background, non-blocking.
 */
function cleanupWebTokens(userId: string): void {
  const key = `web_tokens_cleaned_${userId}`;
  try {
    if (localStorage.getItem(key)) return;
  } catch { /* ignore */ }

  supabase
    .from('user_fcm_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('platform', 'web')
    .then(({ error }) => {
      if (error) {
        console.warn('[Push] Failed to cleanup web tokens:', error);
      } else {
        console.log('[Push] ✓ Legacy web tokens cleaned up');
        try { localStorage.setItem(key, 'true'); } catch { /* ignore */ }
      }
    });
}
