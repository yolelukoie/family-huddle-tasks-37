// Capacitor Native Push Notifications for iOS and Android
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isPlatform, getCurrentPlatform } from './platform';
import { supabase } from '@/integrations/supabase/client';

let registrationListenerAdded = false;
let foregroundListenerAdded = false;
let actionPerformedListenerAdded = false;

/**
 * Register for native push notifications on iOS/Android
 * This uses APNs on iOS and FCM on Android
 */
export async function registerNativePush(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isPlatform('capacitor')) {
    console.log('[NativePush] Not running on native platform, skipping');
    return { success: false, error: 'Not running on native platform' };
  }

  console.log('[NativePush] Registering for native push notifications...');

  try {
    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[NativePush] Current permission status:', permStatus.receive);

    // Request permission if not granted
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      console.log('[NativePush] Requesting permission...');
      permStatus = await PushNotifications.requestPermissions();
      console.log('[NativePush] Permission result:', permStatus.receive);
    }

    if (permStatus.receive !== 'granted') {
      const error = permStatus.receive === 'denied' 
        ? 'Push notifications are blocked. Please enable them in your device settings.'
        : 'Push notification permission was not granted';
      console.log('[NativePush] ❌', error);
      return { success: false, error };
    }

    // Set up registration listener (only once)
    if (!registrationListenerAdded) {
      registrationListenerAdded = true;
      
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[NativePush] ✓ Token received:', token.value.slice(0, 20) + '...');
        
        const platform = getCurrentPlatform(); // 'ios' or 'android'
        console.log('[NativePush] Platform:', platform);
        
        // Save token to database
        const { error } = await supabase
          .from('user_fcm_tokens')
          .upsert(
            { user_id: userId, token: token.value, platform },
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
    }

    // Register with APNs/FCM
    await PushNotifications.register();
    console.log('[NativePush] ✓ Registration initiated');

    return { success: true };
  } catch (e: any) {
    console.error('[NativePush] ❌ Error:', e);
    return { success: false, error: e?.message || 'Failed to register for push notifications' };
  }
}

/**
 * Listen for foreground push notifications on native platforms
 * Returns cleanup function
 */
export function listenNativePush(
  onNotification: (data: any) => void
): () => void {
  if (!isPlatform('capacitor')) {
    return () => {};
  }

  console.log('[NativePush] Setting up foreground listener...');

  // Handle notifications received while app is in foreground
  if (!foregroundListenerAdded) {
    foregroundListenerAdded = true;
    
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[NativePush] Foreground notification:', notification);
      
      // Convert to format similar to FCM web payload
      const payload = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
      };
      
      try {
        onNotification(payload);
      } catch (e) {
        console.error('[NativePush] Error in notification handler:', e);
      }
    });
  }

  // Handle notification tap (when user taps on notification)
  if (!actionPerformedListenerAdded) {
    actionPerformedListenerAdded = true;
    
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[NativePush] Notification tapped:', action);
      
      // Convert to format similar to FCM web payload
      const payload = {
        notification: {
          title: action.notification.title,
          body: action.notification.body,
        },
        data: action.notification.data || {},
      };
      
      try {
        onNotification(payload);
      } catch (e) {
        console.error('[NativePush] Error in action handler:', e);
      }
    });
  }

  // Return cleanup function
  return () => {
    console.log('[NativePush] Cleaning up listeners...');
    PushNotifications.removeAllListeners();
    registrationListenerAdded = false;
    foregroundListenerAdded = false;
    actionPerformedListenerAdded = false;
  };
}

/**
 * Delete native push token on logout
 */
export async function deleteNativePushToken(userId: string): Promise<void> {
  if (!isPlatform('capacitor')) {
    return;
  }

  console.log('[NativePush] Deleting token for user:', userId);
  
  try {
    // We don't have easy access to the current token, so delete all tokens for this user on this platform
    const platform = getCurrentPlatform();
    const { error } = await supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);
    
    if (error) {
      console.error('[NativePush] Failed to delete token:', error);
    } else {
      console.log('[NativePush] Token deleted successfully');
    }
  } catch (e) {
    console.error('[NativePush] deleteNativePushToken error:', e);
  }
}
