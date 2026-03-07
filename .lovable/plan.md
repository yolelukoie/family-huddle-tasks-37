

# Fix: Resume Listener Race Condition in AppLayout

## Problem
The resume listener cleanup in `AppLayout.tsx` (lines 84-96) has a race condition. The `resumeCleanup` variable is captured *synchronously* by `nativeResumeCleanup` on line 94-96, but the actual cleanup function is assigned *asynchronously* inside the `.then()` on line 90. This means `originalCleanup` is always `undefined` when captured, so the resume listener is **never cleaned up** -- stacking duplicate listeners on every effect re-run.

## Everything Else Looks Correct
After the previous round of fixes:
- Platform detection uses `Capacitor.isNativePlatform()` correctly
- Auto-registration on auth is in place
- Android notification channel is created in `capacitorPush.ts`
- `send-push` edge function includes `channel_id`
- "Enable Notifications" button handles `denied` state with `openSettings`
- Firebase config in service worker matches `fcm.ts`

The **only remaining code bug** is the resume listener cleanup race condition.

## Fix

**File: `src/components/layout/AppLayout.tsx`** (lines 78-96)

Replace the current resume listener setup with a pattern that properly captures the async listener handle:

```typescript
// Native: automatically register for push on every auth (ensures token is in DB)
if (isPlatform('capacitor')) {
  console.log('[Push] Native platform — auto-registering push for user:', user.id);
  requestPushPermission(user.id);

  // Also re-register on app resume
  let resumeListenerHandle: any = null;
  import('@capacitor/app').then(({ App }) => {
    resumeListenerHandle = App.addListener('resume', () => {
      console.log('[Push] App resumed — re-registering native push');
      requestPushPermission(user.id);
    });
  }).catch(() => {});

  // Cleanup uses the mutable ref directly (not a snapshot)
  var nativeResumeCleanup = () => {
    if (resumeListenerHandle) {
      resumeListenerHandle.then((l: any) => l.remove());
    }
  };
}
```

The key difference: instead of capturing `resumeCleanup` by value (which is `undefined` at capture time), we capture `resumeListenerHandle` by **reference** -- a mutable `let` variable in the same closure that gets assigned by the time cleanup runs.

## Deployment Reminder
The `send-push` edge function update (adding `channel_id`) needs to be deployed to Supabase for background notifications to work. This is the only server-side change.

