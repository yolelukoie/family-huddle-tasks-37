
# Fix: Android Push Notifications and Real-Time Task Delivery

## Problems Found

1. **Personal Settings "Enable Notifications" button is broken on Android** -- It imports `requestAndSaveFcmToken` from `fcm.ts` (web-only), which immediately exits on Capacitor with "Use native push". The permission status also checks `window.Notification` (web API) instead of Capacitor's native API.

2. **Notification permission dialog may not appear on Android** -- The dialog itself works correctly (uses the unified `pushNotifications.ts`), but the initial permission check in `AppLayout` could fail silently if the Capacitor plugin throws.

3. **No Android FCM tokens are ever saved** -- Because neither the dialog nor the settings button successfully registers a native push token, there are zero Android tokens in the database. The `send-push` edge function finds no token and silently skips delivery.

4. **Background task assignments are permanently lost** -- When the app is backgrounded, Supabase Realtime is suspended. Without a registered FCM token, the push notification fallback also fails. Assigned tasks with status "pending" are never shown to the user.

5. **`send-push` only delivers to one token** -- Even when tokens exist, `LIMIT 1` means only one device gets notified. Users with multiple devices miss notifications.

## Solution

### 1. Fix Personal Settings Page (`src/pages/personal/PersonalPage.tsx`)

- Replace `requestAndSaveFcmToken` import with `requestPushPermission` from `@/lib/pushNotifications`
- Replace web-only `Notification.permission` check with `getPushPermissionStatus()` from the unified API
- This makes the "Enable Notifications" button work on Android, iOS, and web

### 2. Fix Permission Status Check (`src/pages/personal/PersonalPage.tsx`)

- Use `getPushPermissionStatus()` (async, platform-aware) instead of `window.Notification.permission` (web-only)
- Map the result to the UI states (granted/denied/prompt)

### 3. Fix `send-push` Edge Function to Deliver to ALL Tokens

- Change `LIMIT 1` + `.single()` to fetch ALL tokens for the recipient
- Loop through each token and send the notification to every registered device
- Clean up invalid tokens (UNREGISTERED responses) automatically

### 4. Add Pending Task Check on App Resume

- When the app comes to foreground (or on login), query the database for any pending tasks assigned to the current user
- Show the assignment modal for any missed tasks
- This ensures tasks assigned while the app was closed are never lost

### 5. Fix Build Errors in `delete-account` Edge Function

- Fix the TypeScript errors in `supabase/functions/delete-account/index.ts` (unrelated but blocking deployment)

---

## Files to Change

| File | Change |
|------|--------|
| `src/pages/personal/PersonalPage.tsx` | Use unified push API instead of web-only FCM; fix permission status check |
| `supabase/functions/send-push/index.ts` | Send to ALL tokens for a user, not just one; auto-cleanup invalid tokens |
| `src/components/layout/AppLayout.tsx` | Add pending task check on app resume for missed assignments |
| `supabase/functions/delete-account/index.ts` | Fix TypeScript build errors |

---

## Technical Details

### PersonalPage.tsx Changes

```text
Before:
  import { requestAndSaveFcmToken } from '@/lib/fcm';
  // checks Notification.permission (web-only)

After:
  import { requestPushPermission, getPushPermissionStatus } from '@/lib/pushNotifications';
  // checks platform-aware permission status
  // button calls requestPushPermission (routes to native on Android)
```

### send-push Changes

```text
Before:
  .limit(1).single()  -->  sends to ONE token only

After:
  Fetch ALL tokens for recipientId
  Loop and send to each token
  Delete tokens that return UNREGISTERED
```

### Pending Task Recovery (AppLayout.tsx)

```text
On app resume / initial load:
  Query tasks WHERE assigned_to = user.id AND status = 'pending'
  For each pending task, show the assignment modal
  This catches tasks assigned while the app was closed
```

This approach ensures:
- Android users can enable notifications (dialog + settings button)
- Push notifications reach all registered devices
- Tasks assigned while offline are recovered on next app open
