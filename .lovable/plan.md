

# Fix Push Notifications on Android (Native Capacitor)

## Root Causes Identified

1. **Platform detection is fragile** -- `isPlatform('capacitor')` checks `window.Capacitor` which may not be set when code runs early. This causes the app to fall through to the web FCM path on Android native, which fails silently in WebView.

2. **No automatic native push registration on auth** -- Native push registration only happens when user clicks "Enable Notifications" button. There is no automatic `registerNativePush()` call after login on native platforms.

3. **"Enable Notifications" button is disabled when `denied`** -- Line 417: `disabled={notificationPermission === 'denied'}`. On Android, if user denied once, they cannot recover from within the app.

4. **Notification dialog gated by localStorage + route** -- The dialog only shows on `/` (MainPage) route and uses `localStorage` flag. On native, this is unreliable and may never trigger native permission request.

5. **Firebase config mismatch** -- `firebase-messaging-sw.js` uses project `family-huddle-2062` while `fcm.ts` uses `family-huddle-app`. Only matters for web, but indicates config drift.

6. **No Android notification channel** -- Modern Android (8+) requires a notification channel for reliable background delivery. None is created.

## Implementation Plan

### 1. Fix platform detection (`src/lib/platform.ts`)
- Import `Capacitor` from `@capacitor/core` directly instead of checking `window.Capacitor`
- This ensures reliable detection even during early app bootstrap

### 2. Add automatic native push bootstrap (`src/components/layout/AppLayout.tsx`)
- In the existing effect #2 (push listener setup), add: if `isPlatform('capacitor')` and user is authenticated, call `registerNativePush(userId)` directly
- Also call on app resume via `@capacitor/app` listener
- Remove dependency on localStorage `notification_prompt_shown` flag for native platforms

### 3. Create Android notification channel (`src/lib/capacitorPush.ts`)
- On `initListeners()`, call `PushNotifications.createChannel()` with id `family_huddle_default`, name "Family Huddle", importance 5 (high)
- This ensures background notifications have a channel to land on

### 4. Fix "Enable Notifications" button for denied state (`src/pages/personal/PersonalPage.tsx`)
- Remove `disabled` when permission is `denied`
- When `denied` on native: use `import('@capacitor/app').then(({App}) => App.openSettings())` to open device settings (only way to recover on Android after denial)
- When `denied` on web: show guidance text to open browser settings
- Update button label for denied state to "Open Settings"

### 5. Fix notification dialog for native (`src/components/layout/AppLayout.tsx`)
- On native platforms, skip the educational dialog and directly call `registerNativePush` which triggers the OS-level permission prompt
- The OS prompt IS the dialog on native; no need for a custom pre-prompt

### 6. Add `channelId` to send-push payload (`supabase/functions/send-push/index.ts`)
- In `sendToToken()`, add `android: { priority: "high", notification: { channel_id: "family_huddle_default" } }` to the FCM payload

### 7. Fix Firebase config in service worker (`public/firebase-messaging-sw.js`)
- Update to match the `family-huddle-app` project credentials from `src/lib/fcm.ts`

## Files to Change
- `src/lib/platform.ts` -- use `@capacitor/core` import
- `src/lib/capacitorPush.ts` -- add channel creation in `initListeners()`
- `src/components/layout/AppLayout.tsx` -- auto-register native push on auth, skip dialog on native
- `src/pages/personal/PersonalPage.tsx` -- fix denied button, add openSettings for native
- `supabase/functions/send-push/index.ts` -- add channelId to Android payload
- `public/firebase-messaging-sw.js` -- fix Firebase project config

