

# Fix: Robust Push Notification Token & Listener Management

## Overview

All four issues share a single root cause: listeners are managed with independent boolean flags, cleanup tears everything down, and there's no device-specific token tracking. The optimal fix is to restructure `capacitorPush.ts` so that **listeners are registered exactly once for the app lifecycle** and all mutable state (user ID, device token, notification callback) lives in module-level variables that get swapped on sign-in/sign-out.

With this approach, **issue 2 resolves itself** -- there's no need to remove listeners at all. The cleanup function from `listenNativePush` simply nulls out the callback ref, and `registerNativePush` swaps `currentUserId`. No listener is ever torn down or re-added.

## Changes (single file: `src/lib/capacitorPush.ts`)

### Module-Level State

Replace the three boolean flags with:

- `currentDeviceToken: string | null` -- stores the FCM token received by this specific device
- `notificationHandler: ((data: any) => void) | null` -- mutable ref to the latest notification callback
- `listenersInitialized: boolean` -- single flag, set once, never reset

### `registerNativePush(userId)`

1. Set `currentUserId = userId`
2. If `!listenersInitialized`, add all four listeners once:
   - `registration` -- saves token to DB for `currentUserId`, stores in `currentDeviceToken`
   - `registrationError` -- logs error
   - `pushNotificationReceived` -- calls `notificationHandler?.(payload)` (always latest ref)
   - `pushNotificationActionPerformed` -- calls `notificationHandler?.(payload)`
   - Set `listenersInitialized = true`
3. Call `PushNotifications.register()` -- OS may fire `registration` event immediately with cached token, or async

### `listenNativePush(onNotification)`

1. Set `notificationHandler = onNotification` (this is the only thing it does now -- listeners are already registered)
2. Return cleanup: `() => { notificationHandler = null; }`
3. No `removeAllListeners()`, no flag resets

### `deleteNativePushToken(userId)`

1. If `currentDeviceToken` is set: delete from DB using `.eq('user_id', userId).eq('token', currentDeviceToken)` -- only removes THIS device's token
2. If `currentDeviceToken` is null (edge case): fall back to `.eq('user_id', userId).eq('platform', platform)` for safety
3. Reset `currentDeviceToken = null` and `currentUserId = null`

## How Each Issue Is Resolved

| Issue | Fix |
|-------|-----|
| 1. Logout deletes all tokens | `deleteNativePushToken` now deletes only `currentDeviceToken` |
| 2. Aggressive listener cleanup | Listeners are never removed -- they persist for the app lifecycle. Cleanup only nulls out `notificationHandler`. No flags to reset. |
| 3. Stale `onNotification` closure | Foreground listener calls `notificationHandler?.()` which is a module-level variable updated by `listenNativePush` on every call |
| 4. No re-registration for new user | `registerNativePush` always calls `PushNotifications.register()`. The `registration` listener reads `currentUserId` (already updated) and upserts the token for the new user |

## Sign-Out / Sign-In Flow

```text
User A signs out on Device X:
  signOut() -> deletePushToken(userA)
    -> DELETE WHERE user_id=A AND token=<deviceX_token>
    -> currentDeviceToken = null, currentUserId = null
  Listeners remain active but notificationHandler = null (no-op)

User B signs in on Device X:
  registerNativePush(userB)
    -> currentUserId = userB
    -> PushNotifications.register() fires
    -> registration callback: upserts token for userB
    -> currentDeviceToken = <deviceX_token>
  listenNativePush(callback)
    -> notificationHandler = callback
  Notifications now delivered to User B only
```

## Technical Details

The full rewritten file will have this structure:

```text
// Module state
let currentUserId: string | null = null
let currentDeviceToken: string | null = null
let notificationHandler: ((data: any) => void) | null = null
let listenersInitialized = false

function initListeners():
  if listenersInitialized: return
  listenersInitialized = true

  on 'registration': (token) =>
    currentDeviceToken = token.value
    upsert { user_id: currentUserId, token: token.value, platform }

  on 'registrationError': log error

  on 'pushNotificationReceived': (notification) =>
    notificationHandler?.({ notification: {...}, data: {...} })

  on 'pushNotificationActionPerformed': (action) =>
    notificationHandler?.({ notification: {...}, data: {...} })

registerNativePush(userId):
  currentUserId = userId
  check/request permissions
  initListeners()
  PushNotifications.register()

listenNativePush(onNotification):
  notificationHandler = onNotification
  return () => { notificationHandler = null }

deleteNativePushToken(userId):
  if currentDeviceToken:
    DELETE WHERE user_id=userId AND token=currentDeviceToken
  else:
    DELETE WHERE user_id=userId AND platform=platform  (fallback)
  currentDeviceToken = null
  currentUserId = null
```

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/capacitorPush.ts` | Full rewrite with module-level token tracking, single-init listeners, mutable callback ref |

No other files need changes -- `pushNotifications.ts`, `useAuth.tsx`, and `AppLayout.tsx` all call the same exported functions with the same signatures.
