// Capacitor Native Push Notifications for iOS and Android
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isPlatform, getCurrentPlatform } from './platform';
import { supabase } from '@/integrations/supabase/client';

// Module-level state — survives the entire app lifecycle
let currentUserId: string | null = null;
let currentDeviceToken: string | null = null;
let notificationHandler: ((data: any) => void) | null = null;
let listenersInitialized = false;

/**
 * Initialize all Capacitor push listeners exactly once.
 * They persist for the app lifecycle; mutable refs (currentUserId,
 * notificationHandler) are read at call-time so they're never stale.
 */
function initListeners(): void {
  if (listenersInitialized) return;
  listenersInitialized = true;

  // Token received from APNs / FCM
  PushNotifications.addListener('registration', async (token: Token) => {
    currentDeviceToken = token.value;
    console.log('[NativePush] ✓ Token received:', token.value.slice(0, 20) + '...');

    const uid = currentUserId;
    if (!uid) {
      console.error('[NativePush] ❌ No current user ID when token received');
      return;
    }

    const platform = getCurrentPlatform();
    console.log('[NativePush] Platform:', platform, 'User:', uid);

    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert(
        { user_id: uid, token: token.value, platform },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.error('[NativePush] ❌ Failed to save token:', error);
    } else {
      console.log('[NativePush] ✓ Token saved successfully');
    }
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[NativePush] ❌ Registration error:', error);
  });

  // Foreground notification — delegates to mutable notificationHandler
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[NativePush] Foreground notification:', notification);
    const payload = {
      notification: { title: notification.title, body: notification.body },
      data: notification.data || {},
    };
    try {
      notificationHandler?.(payload);
    } catch (e) {
      console.error('[NativePush] Error in notification handler:', e);
    }
  });

  // Notification tap
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('[NativePush] Notification tapped:', action);
    const payload = {
      notification: { title: action.notification.title, body: action.notification.body },
      data: action.notification.data || {},
    };
    try {
      notificationHandler?.(payload);
    } catch (e) {
      console.error('[NativePush] Error in action handler:', e);
    }
  });

  console.log('[NativePush] ✓ Listeners initialized (once)');
}

/**
 * Register for native push notifications on iOS/Android.
 */
export async function registerNativePush(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isPlatform('capacitor')) {
    return { success: false, error: 'Not running on native platform' };
  }

  console.log('[NativePush] Registering for user:', userId);
  currentUserId = userId;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      const error = permStatus.receive === 'denied'
        ? 'Push notifications are blocked. Please enable them in your device settings.'
        : 'Push notification permission was not granted';
      console.log('[NativePush] ❌', error);
      return { success: false, error };
    }

    initListeners();
    await PushNotifications.register();
    console.log('[NativePush] ✓ Registration initiated');
    return { success: true };
  } catch (e: any) {
    console.error('[NativePush] ❌ Error:', e);
    return { success: false, error: e?.message || 'Failed to register for push notifications' };
  }
}

/**
 * Set the foreground notification callback.
 * Returns a cleanup that nulls the handler (listeners stay alive).
 */
export function listenNativePush(
  onNotification: (data: any) => void
): () => void {
  if (!isPlatform('capacitor')) {
    return () => {};
  }

  notificationHandler = onNotification;
  console.log('[NativePush] ✓ Notification handler updated');

  return () => {
    notificationHandler = null;
    console.log('[NativePush] Notification handler cleared');
  };
}

/**
 * Delete THIS device's push token on logout.
 */
export async function deleteNativePushToken(userId: string): Promise<void> {
  if (!isPlatform('capacitor')) return;

  console.log('[NativePush] Deleting token for user:', userId);

  try {
    if (currentDeviceToken) {
      // Delete only this device's token
      const { error } = await supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', currentDeviceToken);

      if (error) {
        console.error('[NativePush] Failed to delete token:', error);
      } else {
        console.log('[NativePush] ✓ Device token deleted');
      }
    } else {
      // Fallback: no cached token, delete by platform
      const platform = getCurrentPlatform();
      const { error } = await supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform);

      if (error) {
        console.error('[NativePush] Failed to delete tokens (fallback):', error);
      } else {
        console.log('[NativePush] ✓ Platform tokens deleted (fallback)');
      }
    }
  } catch (e) {
    console.error('[NativePush] deleteNativePushToken error:', e);
  }

  currentDeviceToken = null;
  currentUserId = null;
}
