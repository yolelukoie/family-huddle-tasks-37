// src/lib/fcm.ts
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

// Utility functions for iOS/PWA detection
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

export function isIOSSafari(): boolean {
  return isIOS() && !isStandalone();
}

const firebaseConfig = {
  apiKey: "AIzaSyBES2a1nZEqfBKk7GkNc5nkFACOe60JV8E",
  authDomain: "family-huddle-app.firebaseapp.com",
  projectId: "family-huddle-app",
  storageBucket: "family-huddle-app.firebasestorage.app",
  messagingSenderId: "508239163662",
  appId: "1:508239163662:web:4192a2e3ca9746bcdea75f",
  measurementId: "G-598JQT461W",
};

// Public VAPID key from Firebase → Cloud Messaging → Web configuration
const VAPID_PUBLIC_KEY = "BKH7SmPFC-v8tg9qKIYyRL5dyFCdiHYXzsVnjgmcOppIqeUBTZwe8OyA2YhOYzusp6ryOk4UNqwI9hNz34J19O0";

let messaging: Messaging | null = null;

export async function ensureMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) {
    console.warn("[FCM] Messaging not supported in this browser");
    return null;
  }

  if (!getApps().length) {
    console.log("[FCM] Initializing Firebase app...");
    initializeApp(firebaseConfig);
  }
  if (!messaging) {
    console.log("[FCM] Getting messaging instance...");
    messaging = getMessaging();
  }
  return messaging;
}

/** Ask permission, get FCM token, upsert into Supabase */
export async function requestAndSaveFcmToken(userId: string): Promise<{ success: boolean; error?: string }> {
  console.log("[FCM] Starting token registration for user:", userId);
  console.log("[FCM] Device info:", {
    isIOS: isIOS(),
    isStandalone: isStandalone(),
    isIOSSafari: isIOSSafari(),
    userAgent: navigator.userAgent,
  });

  // Check iOS Safari limitation
  if (isIOSSafari()) {
    const error =
      "To enable notifications on iPhone, first install this app to your home screen (Share → Add to Home Screen)";
    console.warn("[FCM] ❌ iOS Safari detected, PWA installation required");
    return { success: false, error };
  }

  const m = await ensureMessaging();
  if (!m) {
    const error = "Push notifications are not supported in this browser";
    console.warn("[FCM] ❌", error);
    return { success: false, error };
  }

  // 1) Check current permission state
  console.log("[FCM] Current permission:", Notification.permission);
  let permission: NotificationPermission = Notification.permission;

  // If permission is default (never asked), request it now (must be from user gesture!)
  if (permission === "default") {
    console.log("[FCM] Requesting notification permission...");
    try {
      permission = await Notification.requestPermission();
      console.log("[FCM] Permission result:", permission);
    } catch (e) {
      console.error("[FCM] ❌ Permission request error:", e);
      return { success: false, error: "Failed to request notification permission" };
    }
  }

  if (permission !== "granted") {
    const error =
      permission === "denied"
        ? "Notifications are blocked. Please enable them in your browser settings."
        : "Notification permission was not granted";
    console.log("[FCM] ❌", error);
    return { success: false, error };
  }
  console.log("[FCM] ✓ Permission granted");

  // 2) Wait for service worker to be ready
  console.log("[FCM] Waiting for service worker...");
  let swReg;
  try {
    swReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker timeout")), 10000)),
    ]);
    console.log("[FCM] Service Worker ready, scope:", swReg.scope);
  } catch (e) {
    console.error("[FCM] ❌ Service worker error:", e);
    return { success: false, error: "Service worker not ready. Please refresh the page." };
  }

  // 3) Get FCM token
  console.log("[FCM] Getting FCM token...");
  let token: string | null = null;
  try {
    token = await getToken(m, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: swReg,
    });
    console.log("[FCM] ✓ Token received:", token ? `${token.slice(0, 10)}...` : "null");
  } catch (e: any) {
    console.error("[FCM] ❌ getToken failed:", e);
    const errorMsg = e?.message || "Failed to get notification token";
    return { success: false, error: errorMsg };
  }

  if (!token) {
    console.warn("[FCM] ❌ No token returned from getToken()");
    return { success: false, error: "Failed to generate notification token" };
  }

  // 4) upsert to Supabase
  console.log("[FCM] Upserting token to Supabase...", { userId, tokenPreview: token.slice(0, 10) + "..." });

  const { error } = await supabase
    .from("user_fcm_tokens")
    .upsert({ user_id: userId, token, platform: "web" }, { onConflict: "user_id,token" });

  if (error) {
    console.error("[FCM] ❌ upsert token failed:", error);
    return { success: false, error: "Failed to save notification token" };
  }

  console.log("[FCM] ✓ Token saved successfully to user_fcm_tokens");
  return { success: true };
}

/** Foreground message hook (optional): call once to handle toasts, etc.
 * Returns unsubscribe function for cleanup */
export async function listenForegroundMessages(onPayload: (p: any) => void): Promise<(() => void) | null> {
  const m = await ensureMessaging();
  if (!m) return null;
  console.log("[FCM] Setting up foreground message listener...");
  const unsubscribe = onMessage(m, (payload) => {
    console.log("[FCM] Foreground message received:", payload);
    try {
      onPayload(payload);
    } catch (e) {
      console.error("[FCM] Error in foreground message handler:", e);
    }
  });
  return unsubscribe;
}

/** Get the current FCM token without requesting permission */
export async function getCurrentFcmToken(): Promise<string | null> {
  const m = await ensureMessaging();
  if (!m) return null;

  // Check if we have permission
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const swReg = await navigator.serviceWorker.ready;
    const token = await getToken(m, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (e) {
    console.error("[FCM] getCurrentFcmToken failed:", e);
    return null;
  }
}

/** Delete the current device's FCM token from the database on logout */
export async function deleteFcmToken(userId: string): Promise<void> {
  console.log("[FCM] Deleting token for user:", userId);
  try {
    const token = await getCurrentFcmToken();
    if (token) {
      const { error } = await supabase
        .from("user_fcm_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("token", token);
      
      if (error) {
        console.error("[FCM] Failed to delete token:", error);
      } else {
        console.log("[FCM] Token deleted successfully");
      }
    } else {
      console.log("[FCM] No token to delete");
    }
  } catch (e) {
    console.error("[FCM] deleteFcmToken error:", e);
  }
}
