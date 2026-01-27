// Unified Push Notifications API - Hybrid Web/Native
// This module provides a single API that works on both web (FCM) and native (Capacitor)

import { isPlatform } from './platform';
import { requestAndSaveFcmToken, listenForegroundMessages, deleteFcmToken } from './fcm';
import { registerNativePush, listenNativePush, deleteNativePushToken } from './capacitorPush';

/**
 * Request push notification permission and register token
 * Automatically uses the correct implementation based on platform
 */
export async function requestPushPermission(userId: string): Promise<{ success: boolean; error?: string }> {
  if (isPlatform('capacitor')) {
    console.log('[Push] Using native push (Capacitor)');
    return registerNativePush(userId);
  } else {
    console.log('[Push] Using web push (FCM)');
    return requestAndSaveFcmToken(userId);
  }
}

/**
 * Listen for foreground push notifications
 * Returns cleanup function
 */
export async function listenForPushNotifications(
  onNotification: (payload: any) => void
): Promise<(() => void) | null> {
  if (isPlatform('capacitor')) {
    console.log('[Push] Setting up native foreground listener');
    const cleanup = listenNativePush(onNotification);
    return cleanup;
  } else {
    console.log('[Push] Setting up web foreground listener');
    return listenForegroundMessages(onNotification);
  }
}

/**
 * Delete push token on logout
 * Cleans up the current device's token from the database
 */
export async function deletePushToken(userId: string): Promise<void> {
  if (isPlatform('capacitor')) {
    await deleteNativePushToken(userId);
  } else {
    await deleteFcmToken(userId);
  }
}

/**
 * Check if push notifications are available on this platform
 */
export function isPushAvailable(): boolean {
  if (isPlatform('capacitor')) {
    // Native platforms always support push
    return true;
  }
  
  // Web: Check for service worker and notification support
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('Notification' in window)) return false;
  
  return true;
}

/**
 * Check current push notification permission status
 */
export async function getPushPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
  if (isPlatform('capacitor')) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const status = await PushNotifications.checkPermissions();
      if (status.receive === 'granted') return 'granted';
      if (status.receive === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unavailable';
    }
  }
  
  // Web
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unavailable';
  }
  
  const permission = Notification.permission;
  if (permission === 'granted') return 'granted';
  if (permission === 'denied') return 'denied';
  return 'prompt';
}
