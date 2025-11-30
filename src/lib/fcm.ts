// src/lib/fcm.ts
import { supabase } from "@/integrations/supabase/client";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, isSupported, getToken, onMessage, Messaging, MessagePayload } from "firebase/messaging";

let messaging: Messaging | null = null;

function ensureFirebase(): Messaging | null {
  if (messaging) return messaging;
  if (!("serviceWorker" in navigator)) return null;

  // Your Firebase Web config (project: family-huddle-2062)
  const firebaseConfig = {
    apiKey: "AIzaSyAlhcCtBwCb2yQA7eoo1d_6o4ZStiZxFjQ",
    authDomain: "family-huddle-2062.firebaseapp.com",
    projectId: "family-huddle-2062",
    messagingSenderId: "897887762238",
    appId: "1:897887762238:web:7e8a5677529e040ccbde6f",
  };

  if (!getApps().length) initializeApp(firebaseConfig);
  return (messaging = getMessaging());
}

/** Ask for permission, get a token via the SW, and upsert into Supabase. */
export async function requestAndSaveFcmToken(userId: string) {
  try {
    if (!userId) return; // must be authenticated for RLS

    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Not supported in this browser.");
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      console.info("[FCM] Permission not granted.");
      return;
    }

    const msg = ensureFirebase();
    if (!msg) {
      console.error("[FCM] Messaging not initialized.");
      return;
    }

    // Ensure SW is ready
    const reg = await navigator.serviceWorker.ready;

    // Use env if present, else fallback to your hard-coded VAPID key
    const vapidKey =
      import.meta.env.VITE_FIREBASE_VAPID_KEY ??
      "BKa4ylqpcOvhXB1gGFOgZ9Yr_tr1MSZE06j6LdtJJAB4jdLuQzBD20B0ScpePv4IpweSKsQHk369PUO79xpRdm8";

    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: reg });
    if (!token) {
      console.warn("[FCM] getToken returned empty token.");
      return;
    }
    console.log("[FCM] Token:", token.slice(0, 10) + "…");

    // Save token (idempotent via unique(user_id, token))
    const { error } = await supabase
      .from("user_fcm_tokens")
      .insert({ user_id: userId, token, platform: "web" })
      .select("id")
      .single();

    if (error && error.code !== "23505") {
      console.error("[FCM] Failed to save token:", error);
    } else {
      console.log("[FCM] Token saved (or already present).");
    }
  } catch (e) {
    console.error("[FCM] Token request failed:", e);
  }
}

/** Foreground push handler (tab is focused). */
export function listenForegroundMessages(cb: (p: MessagePayload) => void) {
  const msg = ensureFirebase();
  if (!msg) return () => {};
  const unsub = onMessage(msg, (payload) => cb(payload));
  return unsub;
}
