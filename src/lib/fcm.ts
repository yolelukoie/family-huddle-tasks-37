// src/lib/fcm.ts
import { supabase } from "@/integrations/supabase/client";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, isSupported, getToken, onMessage, Messaging, MessagePayload } from "firebase/messaging";

let messaging: Messaging | null = null;

// ---- 1) One source of truth for your VAPID key (env first, fallback to your hard-coded key) ----
const VAPID_PUBLIC_KEY =
  (import.meta as any)?.env?.VITE_FIREBASE_VAPID_KEY ??
  "BKa4ylqpcOvhXB1gGFOgZ9Yr_tr1MSZE06j6LdtJJAB4jdLuQzBD20B0ScpePv4IpweSKsQHk369PUO79xpRdm8";

// ---- 2) Your Firebase Web config (project must match the SW file at /firebase-messaging-sw.js) ----
const firebaseConfig = {
  apiKey: "AIzaSyAlhcCtBwCb2yQA7eoo1d_6o4ZStiZxFjQ",
  authDomain: "family-huddle-2062.firebaseapp.com",
  projectId: "family-huddle-2062",
  messagingSenderId: "897887762238",
  appId: "1:897887762238:web:7e8a5677529e040ccbde6f",
};

async function ensureSWRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // If your app already registers the SW elsewhere, this is harmless:
  try {
    // Try to reuse ready registration first; if not, register.
    return (
      (await navigator.serviceWorker.ready) || (await navigator.serviceWorker.register("/firebase-messaging-sw.js"))
    );
  } catch {
    try {
      return await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    } catch (e) {
      console.error("[FCM] SW register failed:", e);
      return null;
    }
  }
}

function ensureMessaging(): Messaging | null {
  if (messaging) return messaging;
  if (!("serviceWorker" in navigator)) return null;
  if (!getApps().length) initializeApp(firebaseConfig);
  return (messaging = getMessaging());
}

/** Ask permission, get an FCM token via the SW, and upsert it into Supabase. */
export async function requestAndSaveFcmToken(userId: string) {
  try {
    if (!userId) return;
    if (!(await isSupported())) {
      console.warn("[FCM] Not supported in this browser.");
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      console.info("[FCM] Permission not granted.");
      return;
    }

    const msg = ensureMessaging();
    const reg = await ensureSWRegistered();
    if (!msg || !reg) return;

    if (!VAPID_PUBLIC_KEY) {
      console.error("[FCM] Missing VAPID public key.");
      return;
    }

    const token = await getToken(msg, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) {
      console.warn("[FCM] getToken returned empty token.");
      return;
    }

    // Prefer upsert so repeated calls don’t error.
    const { error } = await supabase.from("user_fcm_tokens").upsert(
      { user_id: userId, token, platform: "web" },
      { onConflict: "user_id,token" }, // requires unique(user_id, token)
    );

    if (error) {
      console.error("[FCM] Failed to save token:", error);
    } else {
      console.log("[FCM] Token saved/upserted.");
    }
  } catch (e) {
    console.error("[FCM] Token request failed:", e);
  }
}

/** Foreground messages (tab focused). */
export function listenForegroundMessages(cb: (p: MessagePayload) => void) {
  const msg = ensureMessaging();
  if (!msg) return () => {};
  return onMessage(msg, (payload) => cb(payload));
}
