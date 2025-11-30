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
  if (!(await isSupported())) return null;

  if (!getApps().length) initializeApp(firebaseConfig);
  if (!messaging) messaging = getMessaging();
  return messaging;
}

/** Ask permission, get FCM token, upsert into Supabase */
export async function requestAndSaveFcmToken(userId: string) {
  const m = await ensureMessaging();
  if (!m) {
    console.warn('[FCM] Messaging not supported in this browser');
    return;
  }

  // 1) permission
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    // Safari <16 fallback
    permission = Notification.permission;
  }
  if (permission !== 'granted') {
    console.log('[FCM] Notifications permission not granted');
    return;
  }

  // 2) token
  let token: string | null = null;
  try {
    token = await getToken(m, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready, // ensures our SW is ready
    });
  } catch (e) {
    console.error('[FCM] getToken failed:', e);
    return;
  }
  if (!token) {
    console.warn('[FCM] No token returned');
    return;
  }

  // 3) upsert to Supabase
  const { error } = await supabase
    .from('user_fcm_tokens')
    .upsert({ user_id: userId, token, platform: 'web' })
    .select('id')
    .single();

  if (error) {
    console.error('[FCM] upsert token failed:', error);
  } else {
    console.log('[FCM] token saved');
  }
}

/** Foreground message hook (optional): call once to handle toasts, etc. */
export async function listenForegroundMessages(onPayload: (p: any) => void) {
  const m = await ensureMessaging();
  if (!m) return;
  onMessage(m, (payload) => {
    try { onPayload(payload); } catch {}
  });
}
