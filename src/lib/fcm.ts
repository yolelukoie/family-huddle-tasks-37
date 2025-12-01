// src/lib/fcm.ts
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const firebaseConfig = {
  apiKey: 'AIzaSyAlhcCtBwCb2yQA7eoo1d_6o4ZStiZxFjQ',
  authDomain: 'family-huddle-2062.firebaseapp.com',
  projectId: 'family-huddle-2062',
  messagingSenderId: '897887762238',
  appId: '1:897887762238:web:7e8a5677529e040ccbde6f',
};

// Public VAPID key from Firebase → Cloud Messaging → Web configuration
const VAPID_PUBLIC_KEY = 'BKa4ylqpcOvhXB1gGFOgZ9Yr_tr1MSZE06j6LdtJJAB4jdLuQzBD20B0ScpePv4IpweSKsQHk369PUO79xpRdm8';

let messaging: Messaging | null = null;

export async function ensureMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (!(await isSupported())) {
    console.warn('[FCM] Messaging not supported in this browser');
    return null;
  }

  if (!getApps().length) {
    console.log('[FCM] Initializing Firebase app...');
    initializeApp(firebaseConfig);
  }
  if (!messaging) {
    console.log('[FCM] Getting messaging instance...');
    messaging = getMessaging();
  }
  return messaging;
}

/** Ask permission, get FCM token, upsert into Supabase */
export async function requestAndSaveFcmToken(userId: string) {
  console.log('[FCM] Starting token registration for user:', userId);
  
  const m = await ensureMessaging();
  if (!m) {
    console.warn('[FCM] ❌ Messaging not supported in this browser');
    return;
  }

  // 1) Check current permission state
  console.log('[FCM] Current permission:', Notification.permission);
  let permission: NotificationPermission = Notification.permission;

  // If permission is default (never asked), request it now (must be from user gesture!)
  if (permission === 'default') {
    console.log('[FCM] Requesting notification permission...');
    try {
      permission = await Notification.requestPermission();
      console.log('[FCM] Permission result:', permission);
    } catch (e) {
      // Safari <16 fallback
      console.warn('[FCM] requestPermission() not available, using Notification.permission', e);
      permission = Notification.permission;
    }
  }

  if (permission !== 'granted') {
    console.log('[FCM] ❌ Notifications permission not granted:', permission);
    return;
  }
  console.log('[FCM] ✓ Permission granted');

  // 2) token
  console.log('[FCM] Getting FCM token...');
  let token: string | null = null;
  try {
    const swReg = await navigator.serviceWorker.ready;
    console.log('[FCM] Service Worker ready, scope:', swReg.scope);
    
    token = await getToken(m, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: swReg,
    });
    console.log('[FCM] ✓ Token received:', token ? `${token.slice(0, 10)}...` : 'null');
  } catch (e) {
    console.error('[FCM] ❌ getToken failed:', e);
    return;
  }
  if (!token) {
    console.warn('[FCM] ❌ No token returned from getToken()');
    return;
  }

  // 3) upsert to Supabase
  console.log('[FCM] Upserting token to Supabase...', { userId, tokenPreview: token.slice(0, 10) + '...' });
  
  const { error } = await supabase
    .from('user_fcm_tokens')
    .upsert(
      { user_id: userId, token, platform: 'web' },
      { onConflict: 'user_id,token' }
    );

  if (error) {
    console.error('[FCM] ❌ upsert token failed:', error);
  } else {
    console.log('[FCM] ✓ Token saved successfully to user_fcm_tokens');
  }
}

/** Foreground message hook (optional): call once to handle toasts, etc. */
export async function listenForegroundMessages(onPayload: (p: any) => void) {
  const m = await ensureMessaging();
  if (!m) return;
  console.log('[FCM] Setting up foreground message listener...');
  onMessage(m, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    try { 
      onPayload(payload); 
    } catch (e) {
      console.error('[FCM] Error in foreground message handler:', e);
    }
  });
}
