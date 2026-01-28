
## Understanding the Current Notification Behavior

### Why Notifications Work Without Enabling in Settings

You're experiencing two **separate notification systems** working independently:

1. **In-App Realtime Notifications** (via Supabase Realtime)
   - These work **without any browser permission**
   - When you're inside the app, the `useRealtimeNotifications` hook listens to database changes
   - Task modals, sounds, and toasts are triggered by database events, not push notifications
   - This is why you see the modal and hear sounds even without enabling notifications

2. **Push Notifications** (via FCM/Capacitor)
   - These require explicit permission and only work when app is in background/closed
   - On web: Needs `Notification.permission === 'granted'`
   - On native (Android/iOS): Needs device permission via Capacitor

**What you're seeing**: The app works great while you're using it because of realtime database subscriptions, but you haven't tested background/closed app notifications which DO require the toggle in settings.

---

## Proposed Solution: One-Time Permission Prompt

Your idea is correct. The app should:
1. **Ask once** when the user first sets up their account (after onboarding)
2. **Allow changes later** in the Personal Settings page (already works)

### Implementation Plan

**Step 1: Create a Notification Permission Dialog Component**

Create `src/components/notifications/NotificationPermissionDialog.tsx`:
- A friendly dialog explaining why notifications are useful
- "Enable Notifications" button (triggers permission request)
- "Maybe Later" button (dismisses but can be enabled in settings)
- Uses the unified `requestPushPermission()` API (works on web and native)

**Step 2: Track if User Has Seen the Prompt**

- Store a flag in `localStorage` (e.g., `notification_prompt_shown`)
- This persists across sessions so users aren't asked repeatedly

**Step 3: Show Dialog After Onboarding Completes**

Modify `src/components/layout/AppLayout.tsx`:
- After user completes onboarding and lands on MainPage for the first time
- Check if `notification_prompt_shown` is false and permission is still "prompt"
- If so, show the `NotificationPermissionDialog`
- Mark as shown after user interacts (either choice)

**Step 4: Update Personal Settings Page**

The current implementation in `PersonalPage.tsx` already allows toggling notifications. No changes needed there, but we'll ensure consistency:
- Show current status
- Allow enabling if not yet granted
- Show "blocked" state if denied (must change in browser/device settings)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/notifications/NotificationPermissionDialog.tsx` | Create | New dialog component for one-time prompt |
| `src/components/layout/AppLayout.tsx` | Modify | Show dialog after onboarding, check localStorage flag |
| `src/i18n/locales/en.json` | Modify | Add translations for dialog text |

---

## Technical Details

### NotificationPermissionDialog Component

```text
+------------------------------------------+
|  🔔 Stay Connected with Your Family      |
|                                          |
|  Get notified when:                      |
|  • You receive a new task assignment     |
|  • A family member completes a task      |
|  • Someone sends a message in chat       |
|                                          |
|  [Enable Notifications]   [Maybe Later]  |
+------------------------------------------+
```

### Logic Flow

```text
User completes onboarding
         ↓
Navigate to MainPage
         ↓
Check: localStorage.notification_prompt_shown === true?
  ├── YES → Do nothing (already asked)
  └── NO → Check: permission === 'prompt'?
              ├── NO (granted/denied) → Set flag, do nothing
              └── YES → Show NotificationPermissionDialog
                          ↓
                    User clicks "Enable"
                          ↓
                    Call requestPushPermission(userId)
                          ↓
                    Set localStorage flag
                          ↓
                    Close dialog
```

### Why This Approach Works

1. **User-Gesture Driven**: The permission request is triggered by clicking a button, not automatically (complies with browser policies)
2. **One-Time Only**: Using localStorage prevents repeated prompts
3. **Platform-Agnostic**: Uses the unified `requestPushPermission()` API that works on web, iOS, and Android
4. **Respects Memory Note**: The memory explicitly states "Notification permission requests must be user-gesture driven and cannot be automatic on page load"
5. **Non-Intrusive**: "Maybe Later" option respects users who don't want notifications

