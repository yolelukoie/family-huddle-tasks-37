{\rtf1\ansi\ansicpg1251\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\fnil\fcharset0 HelveticaNeue;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;}
{\*\expandedcolortbl;;\cssrgb\c0\c1\c1;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // src/hooks/usePushRegistration.ts\
import \{ useEffect \} from "react";\
import \{ initializeApp \} from "firebase/app";\
import \{ getMessaging, getToken, onMessage \} from "firebase/messaging";\
import \{ supabase \cf2 \} from "@/integrations/supabase/client";\
\
const firebaseApp = initializeApp(\{\
  apiKey: "
\f1\fs26 \cf2 AIzaSyC3gtPDwXXiSwTelOBuTp6P6pIUpE_xY48
\f0\fs24 \cf2 ",\
  authDomain: "family-huddle-15398.firebaseapp.com",\
  projectId: "
\f1\fs26 \cf2 family-huddle-15398
\f0\fs24 \cf2 ",\
  messagingSenderId: "
\f1\fs26 \cf2 926874914730
\f0\fs24 \cf2 ",\
  appId: "
\f1\fs26 \cf2 1:926874914730:web:7b9ec4525a2ce0e48d25d3
\f0\fs24 \cf2 ",\
\});\
\
const VAPID_KEY = "
\f1\fs26 \cf2 BNEK4o4gM09u7-b6F0PvBGUP5yVbJK3b-BoVPRVBtax81B5a2zSd0u4fbmPtGO3RDMIWeUdhZKUj1rtHQuleoEY
\f0\fs24 \cf2 "; // from Cloud Messaging \uc0\u8594  Web config\
\
export function usePushRegistration(userId?: string, familyId?: string) \{\
  useEffect(() => \{\
    if (!userId) return;\cf0 \
\
    // Make sure the SW is registered (important on first visit)\
    const ensureSW = async () => \{\
      if ("serviceWorker" in navigator) \{\
        const have = await navigator.serviceWorker.getRegistration();\
        if (!have) \{\
          try \{ await navigator.serviceWorker.register("/firebase-messaging-sw.js"); \}\
          catch (e) \{ console.warn("[push] SW register failed", e); \}\
        \}\
      \}\
    \};\
\
    const run = async () => \{\
      try \{\
        await ensureSW();\
\
        if (!("Notification" in window)) return;\
        const perm = await Notification.requestPermission();\
        if (perm !== "granted") return;\
\
        const messaging = getMessaging(firebaseApp);\
        const swReg = await navigator.serviceWorker.getRegistration() || undefined;\
        const token = await getToken(messaging, \{ vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg \});\
        if (!token) return;\
\
        // Store (or refresh) token in Supabase\
        await supabase.from("device_tokens").upsert(\{\
          user_id: userId,\
          family_id: familyId ?? null,\
          platform: "web",\
          token,\
          last_seen_at: new Date().toISOString(),\
        \}, \{ onConflict: "user_id,platform,token" \});\
\
        // Foreground handler (optional)\
        onMessage(messaging, (payload) => \{\
          console.log("[FCM foreground]", payload);\
          // Could show a toast here if you like\
        \});\
      \} catch (e) \{\
        console.error("[push] registration failed", e);\
      \}\
    \};\
\
    run();\
  \}, [userId, familyId]);\
\}\
}