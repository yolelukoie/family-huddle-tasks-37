

# Fix: Duplicate Notifications + Push Tap Modal Not Opening

## Root Cause Analysis

### Problem 1: Duplicate foreground toasts
Two independent systems both fire for the same event:
1. **Realtime** (`useRealtimeNotifications.tsx` line 100-106): listens to `task_events` INSERT → shows toast for accepted/rejected/completed
2. **FCM foreground** (`capacitorPush.ts` line 92-104): `pushNotificationReceived` fires → calls `handleNotification` in AppLayout → shows toast again

Both trigger simultaneously when the app is in the foreground.

**Fix**: In `capacitorPush.ts`, suppress the foreground notification callback for event types that realtime already handles (`accepted`, `rejected`, `completed`). Only forward foreground pushes for types NOT handled by realtime, or let the handler in AppLayout skip toasting for those types.

The cleanest approach: in AppLayout's `handleNotification`, for foreground (non-tapped) notifications with `event_type` of `accepted`, `rejected`, or `completed` — do nothing (realtime already handles them). This is a 3-line guard.

### Problem 2: Modal doesn't open when tapping push notification
When the app is killed/backgrounded and user taps a notification:
1. `pushNotificationActionPerformed` fires immediately on app launch
2. But `notificationHandler` is **null** — AppLayout's `useEffect` hasn't run yet because auth is still loading
3. The tap payload is **silently dropped** (line 114: `notificationHandler?.(payload)` — optional chaining swallows it)
4. The 400ms delay approach only works if the handler is already connected

**Fix**: Buffer the last tap action in `capacitorPush.ts` at module level. When `listenNativePush` sets the handler, replay the buffered action immediately. This guarantees no tap is lost regardless of timing.

---

## Changes

### 1. `src/lib/capacitorPush.ts` — Buffer tap actions

Add a module-level `pendingTapAction` variable. In `pushNotificationActionPerformed`, if `notificationHandler` is null, store the payload. In `listenNativePush`, after setting the handler, check and replay any buffered tap.

```typescript
// Module level
let pendingTapAction: any = null;

// In pushNotificationActionPerformed listener:
if (notificationHandler) {
  notificationHandler(payload);
} else {
  console.warn('[NativePush] No handler — buffering tap action');
  pendingTapAction = payload;
}

// In listenNativePush(), after setting handler:
notificationHandler = onNotification;
if (pendingTapAction) {
  console.log('[NativePush] Replaying buffered tap action');
  const action = pendingTapAction;
  pendingTapAction = null;
  setTimeout(() => onNotification(action), 100);
}
```

### 2. `src/components/layout/AppLayout.tsx` — Deduplicate foreground toasts

In `handleNotification`, for **foreground** (non-tapped) events of type `accepted`, `rejected`, `completed` — return early since realtime already handles these.

```typescript
// After the tapped block, at start of FOREGROUND section:
if (eventType === 'accepted' || eventType === 'rejected' || eventType === 'completed') {
  console.log('[Push] Skipping foreground toast for', eventType, '— handled by realtime');
  return;
}
```

### 3. `src/components/layout/AppLayout.tsx` — Increase tap delay + add retry

Change the 400ms delay to 600ms for the modal open from tap, and add a safety net: if the modal context isn't ready, retry once after another 500ms.

---

## Summary

| File | Change |
|------|--------|
| `src/lib/capacitorPush.ts` | Buffer tap action when handler is null; replay on handler connect |
| `src/components/layout/AppLayout.tsx` | Skip foreground toasts for accepted/rejected/completed; increase tap-to-modal delay |

No other files need changes. Existing realtime, modal context, and edge function logic remain untouched.

