// src/hooks/usePushRegistration.ts
import { useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

const firebaseApp = initializeApp({
  apiKey: "AIzaSyAlhcCtBwCb2yQA7eoo1d_6o4ZStiZxFjQ",
  authDomain: "family-huddle-2062.firebaseapp.com",
  projectId: "family-huddle-2062",
  messagingSenderId: "897887762238",
  appId: "1:897887762238:web:7e8a5677529e040ccbde6f",
});

const VAPID_KEY = "BKa4ylqpcOvhXB1gGFOgZ9Yr_tr1MSZE06j6LdtJJAB4jdLuQzBD20B0ScpePv4IpweSKsQHk369PUO79xpRdm8"; // from Cloud Messaging → Web config

export function usePushRegistration(userId?: string, familyId?: string) {
  useEffect(() => {
    if (!userId) return;

    // Make sure the SW is registered (important on first visit)
    const ensureSW = async () => {
      if ("serviceWorker" in navigator) {
        const have = await navigator.serviceWorker.getRegistration();
        if (!have) {
          try {
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          } catch (e) {
            console.warn("[push] SW register failed", e);
          }
        }
      }
    };

    const run = async () => {
      try {
        await ensureSW();

        if (!("Notification" in window)) return;
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;

        const messaging = getMessaging(firebaseApp);
        const swReg = (await navigator.serviceWorker.getRegistration()) || undefined;
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
        if (!token) return;

        // Store (or refresh) token in Supabase
        await supabase.from("device_tokens").upsert(
          {
            user_id: userId,
            family_id: familyId ?? null,
            platform: "web",
            token,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform,token" },
        );

        // Foreground handler (optional)
        onMessage(messaging, (payload) => {
          console.log("[FCM foreground]", payload);
          // Could show a toast here if you like
        });
      } catch (e) {
        console.error("[push] registration failed", e);
      }
    };

    run();
  }, [userId, familyId]);
}
