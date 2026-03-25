// Capacitor Native Push Notifications for iOS and Android
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { isPlatform, getCurrentPlatform } from './platform';
import { supabase } from '@/integrations/supabase/client';

// Module-level state — survives the entire app lifecycle
let currentUserId: string | null = null;
let currentDeviceToken: string | null = null;
let pendingToken: string | null = null; // Buffer token if userId not set yet
let notificationHandler: ((data: any) => void) | null = null;
let pendingTapAction: any = null; // Buffer tap if handler not yet connected
let listenersInitialized = false;
let channelCreated = false;

/**
 * Create Android notification channel for reliable background delivery.
 * Required on Android 8+ (API 26+). Idempotent.
 */
async function ensureNotificationChannel(): Promise<void> {
  if (channelCreated) return;
  if (Capacitor.getPlatform() !== 'android') {
    channelCreated = true;
    return;
  }

  try {
    await PushNotifications.createChannel({
      id: 'family_huddle_default',
      name: 'Family Huddle',
      description: 'Task assignments and family notifications',
      importance: 5, // max importance for heads-up display
      visibility: 1, // public
      sound: 'default',
      vibration: true,
    });
    channelCreated = true;
    console.log('[NativePush] ✓ Notification channel created');
  } catch (e) {
    console.error('[NativePush] Channel creation error:', e);
  }
}

/** Save a token to the database */
async function saveTokenToDb(token: string, userId: string): Promise<void> {
  const platform = getCurrentPlatform();
  console.log('[NativePush] Saving token to DB. Platform:', platform, 'User:', userId);

  const { error } = await supabase
    .from('user_fcm_tokens')
    .upsert(
      { user_id: userId, token, platform },
      { onConflict: 'user_id,token' }
    );

  if (error) {
    console.error('[NativePush] ❌ Failed to save token:', error);
  } else {
    console.log('[NativePush] ✓ Token saved successfully');
  }
}

/**
 * Initialize all Capacitor push listeners exactly once.
 */
function initListeners(): void {
  if (listenersInitialized) return;
  listenersInitialized = true;

  // Create notification channel before registering
  ensureNotificationChannel();

  // Token received from APNs / FCM
  PushNotifications.addListener('registration', async (token: Token) => {
    currentDeviceToken = token.value;
    console.log('[NativePush] ✓ Token received:', token.value.slice(0, 20) + '...');

    const uid = currentUserId;
    if (!uid) {
      console.warn('[NativePush] ⚠️ No current user ID when token received — buffering token');
      pendingToken = token.value;
      return;
    }

    await saveTokenToDb(token.value, uid);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[NativePush] ❌ Registration error:', JSON.stringify(error));
  });

  // Foreground notification — delegates to mutable notificationHandler
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[NativePush] Foreground notification:', notification);
    const payload = {
      notification: { title: notification.title, body: notification.body },
      data: notification.data || {},
      meta: { tapped: false },
    };
    try {
      notificationHandler?.(payload);
    } catch (e) {
      console.error('[NativePush] Error in notification handler:', e);
    }
  });

  // Notification tap — includes meta.tapped = true
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('[NativePush] Notification tapped:', action);
    const payload = {
      notification: { title: action.notification.title, body: action.notification.body },
      data: action.notification.data || {},
      meta: { tapped: true },
    };
    if (notificationHandler) {
      try {
        notificationHandler(payload);
      } catch (e) {
        console.error('[NativePush] Error in action handler:', e);
      }
    } else {
      console.warn('[NativePush] No handler — buffering tap action');
      pendingTapAction = payload;
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

  const runtimePlatform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = runtimePlatform === 'android';

  console.log('[NativePush] Registering for user:', userId);
  console.log('[NativePush] Capacitor.getPlatform():', runtimePlatform);
  console.log('[NativePush] Capacitor.isNativePlatform():', isNative);

  currentUserId = userId;

  // Flush any buffered token from before userId was set
  if (pendingToken) {
    console.log('[NativePush] Flushing buffered token to DB');
    await saveTokenToDb(pendingToken, userId);
    currentDeviceToken = pendingToken;
    pendingToken = null;
    return { success: true };
  }

  // Initialize listeners first (idempotent)
  initListeners();

  try {
    console.log('[NativePush] Before checkPermissions()');
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[NativePush] After checkPermissions():', JSON.stringify(permStatus));

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      console.log('[NativePush] Before requestPermissions()');
      permStatus = await PushNotifications.requestPermissions();
      console.log('[NativePush] After requestPermissions():', JSON.stringify(permStatus));
    }

    console.log('[NativePush] Final permission result:', permStatus.receive);

    // On iOS, if denied, we cannot proceed
    if (permStatus.receive === 'denied' && !isAndroid) {
      const error = 'Push notifications are blocked. Please enable them in your device settings.';
      console.log('[NativePush] ❌', error);
      return { success: false, error };
    }

    // On Android: ALWAYS attempt register regardless of permission status
    // checkPermissions() can return confusing values like 'unavailable'
    if (permStatus.receive !== 'granted') {
      console.warn(`[NativePush] ⚠️ Permission is "${permStatus.receive}" — attempting register() anyway`);
    }

    const tokenBeforeRegister = currentDeviceToken;
    console.log('[NativePush] Before PushNotifications.register()');

    try {
      await PushNotifications.register();
      console.log('[NativePush] ✓ PushNotifications.register() completed');
    } catch (regError: any) {
      console.error('[NativePush] ❌ PushNotifications.register() THREW:', regError?.message || JSON.stringify(regError));
      return { success: false, error: regError?.message || 'register() failed' };
    }

    // 10s timeout warning
    setTimeout(() => {
      if (!currentDeviceToken || currentDeviceToken === tokenBeforeRegister) {
        console.warn('[NativePush] ⚠️ No token received 10s after register(). Check Firebase setup / Google Play Services.');
      }
    }, 10000);

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

  // Replay any buffered tap action from cold start
  if (pendingTapAction) {
    console.log('[NativePush] Replaying buffered tap action');
    const action = pendingTapAction;
    pendingTapAction = null;
    setTimeout(() => {
      try { onNotification(action); } catch (e) { console.error('[NativePush] Replay error:', e); }
    }, 100);
  }

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

/** Expose current token for debug UI */
export function getNativeDeviceToken(): string | null {
  return currentDeviceToken;
}
