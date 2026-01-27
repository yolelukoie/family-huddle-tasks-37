

## Capacitor Native Push Notifications Integration Plan

### Current Situation

1. **Why iPhone didn't receive notification**: iOS Safari and iOS Chrome do NOT support web push notifications. The current FCM implementation uses the web SDK which requires Service Workers - these don't work on iOS browsers. Even iOS PWA has limited/unreliable web push support.

2. **What's already working**:
   - Realtime notifications via Supabase channels (works on ALL platforms)
   - Task assignment modal opens correctly when triggered by realtime events
   - Web FCM push works on desktop browsers and Android Chrome
   - Platform detection utility is ready (`src/lib/platform.ts`)
   - Token storage supports platform differentiation (`platform` column)

3. **What needs to be added**:
   - `@capacitor/push-notifications` plugin for native push
   - Hybrid notification initialization that detects platform
   - Native FCM token registration for iOS/Android
   - Minor AndroidManifest.xml updates for push permissions

---

### Implementation Steps

#### Step 1: Install Capacitor Push Notifications Plugin

Add the required dependency to `package.json`:

```
@capacitor/push-notifications
```

This will be installed when you run `npm install` locally after pulling from GitHub.

---

#### Step 2: Create Hybrid Push Notification Module

**New File: `src/lib/pushNotifications.ts`**

Create a unified push notification API that:
- Detects if running in Capacitor native or web
- Uses `@capacitor/push-notifications` for native (iOS/Android)
- Falls back to existing FCM web SDK for browsers
- Registers tokens with the correct `platform` value ('ios', 'android', or 'web')

```text
Architecture:
                   requestPushPermission()
                           |
           ┌───────────────┴───────────────┐
           ▼                               ▼
    isPlatform('capacitor')          isPlatform('web')
           |                               |
           ▼                               ▼
  PushNotifications.register()     requestAndSaveFcmToken()
           |                               |
           ▼                               ▼
   Save token with                  Save token with
   platform: 'ios'/'android'        platform: 'web'
```

---

#### Step 3: Update FCM Module for Platform Awareness

**File: `src/lib/fcm.ts`**

Modify to:
1. Skip web FCM initialization when running in Capacitor native
2. Export the core functions that can be reused (like `isIOS()`, `isStandalone()`)

Add check at the start of `requestAndSaveFcmToken()`:
```typescript
import { isPlatform } from './platform';

export async function requestAndSaveFcmToken(userId: string) {
  // Skip web FCM on native platforms - use Capacitor push instead
  if (isPlatform('capacitor')) {
    console.log('[FCM] Running on native platform, skipping web FCM');
    return { success: false, error: 'Use native push on Capacitor' };
  }
  // ... existing web FCM code
}
```

---

#### Step 4: Create Native Push Handler

**New File: `src/lib/capacitorPush.ts`**

Handles native push notifications for iOS and Android:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { isPlatform, getCurrentPlatform } from './platform';
import { supabase } from '@/integrations/supabase/client';

export async function registerNativePush(userId: string) {
  if (!isPlatform('capacitor')) {
    return { success: false, error: 'Not running on native platform' };
  }
  
  // Request permission
  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    return { success: false, error: 'Permission denied' };
  }
  
  // Register with APNs/FCM
  await PushNotifications.register();
  
  // Listen for token
  PushNotifications.addListener('registration', async (token) => {
    const platform = getCurrentPlatform(); // 'ios' or 'android'
    await supabase
      .from('user_fcm_tokens')
      .upsert({ user_id: userId, token: token.value, platform }, 
              { onConflict: 'user_id,token' });
  });
  
  // Handle foreground notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Handle in-app notification display
    console.log('[NativePush] Foreground:', notification);
  });
  
  return { success: true };
}
```

---

#### Step 5: Update AppLayout for Hybrid Push

**File: `src/components/layout/AppLayout.tsx`**

Modify the push initialization to use the hybrid approach:

```typescript
import { isPlatform } from '@/lib/platform';
import { requestAndSaveFcmToken, listenForegroundMessages } from '@/lib/fcm';
import { registerNativePush, listenNativePush } from '@/lib/capacitorPush';

// In useEffect:
useEffect(() => {
  if (!isAuthenticated || !user?.id) return;

  if (isPlatform('capacitor')) {
    // Native: Use Capacitor push notifications
    registerNativePush(user.id);
    listenNativePush((data) => {
      // Handle 'assigned' events same as FCM handler
    });
  } else {
    // Web: Use existing FCM web SDK
    if ('Notification' in window && Notification.permission === 'granted') {
      requestAndSaveFcmToken(user.id);
    }
    listenForegroundMessages(/* existing handler */);
  }
}, [isAuthenticated, user?.id]);
```

---

#### Step 6: Android Configuration

**File: `android/app/src/main/AndroidManifest.xml`**

Add required permissions for push notifications:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Add Firebase messaging service (Capacitor plugin does this automatically when you run `npx cap sync`).

---

#### Step 7: iOS Configuration (After Running `npx cap add ios`)

**File: `ios/App/App/AppDelegate.swift`**

The Capacitor push notifications plugin will require:
1. Enable Push Notifications capability in Xcode
2. Add APNs key to Firebase Console
3. Download and add `GoogleService-Info.plist` to the iOS project

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@capacitor/push-notifications` dependency |
| `src/lib/capacitorPush.ts` | Create | Native push notification handler |
| `src/lib/pushNotifications.ts` | Create | Unified hybrid API |
| `src/lib/fcm.ts` | Modify | Add platform check to skip on native |
| `src/components/layout/AppLayout.tsx` | Modify | Use hybrid push initialization |
| `android/app/src/main/AndroidManifest.xml` | Modify | Add POST_NOTIFICATIONS permission |
| `capacitor.config.ts` | Modify | Add server URL for live reload during development |

---

### What Will Work After Implementation

| Feature | Web | iOS Native | Android Native |
|---------|-----|------------|----------------|
| Task assignment modal | ✅ Realtime | ✅ Realtime | ✅ Realtime |
| Push notification delivery | ✅ FCM Web | ✅ APNs | ✅ FCM Native |
| Accept/Reject flow | ✅ | ✅ | ✅ |
| Completion notifications | ✅ | ✅ | ✅ |
| Background notifications | ✅ (PWA) | ✅ | ✅ |

---

### Important: Realtime Notifications Are Your Safety Net

Even if push notifications fail to deliver (token issues, permission denied, etc.), the **Realtime subscription in `useRealtimeNotifications.tsx` will still work**. This means:

1. If the app is open (foreground), task assignments will ALWAYS show the modal via realtime
2. Push notifications are only needed for when the app is closed/background
3. The current architecture is already resilient

---

### Local Setup Required by User

After these code changes are deployed, you'll need to:

1. **Pull the code from GitHub**
2. **Install dependencies**: `npm install`
3. **Add iOS platform**: `npx cap add ios` (if not done)
4. **Sync Capacitor**: `npx cap sync`
5. **For iOS**: 
   - Open in Xcode: `npx cap open ios`
   - Enable Push Notifications capability
   - Add APNs key to Firebase Console
   - Download `GoogleService-Info.plist` from Firebase
6. **For Android**: 
   - Download `google-services.json` from Firebase Console
   - Place in `android/app/`
7. **Build and run**: `npx cap run ios` or `npx cap run android`

---

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Web user on desktop | Uses FCM web SDK (works) |
| iOS Safari (no native app) | No push, but realtime notifications work when app is open |
| iOS PWA | Limited web push, realtime works |
| iOS native app (Capacitor) | Uses APNs via Capacitor plugin |
| Android Chrome | Uses FCM web SDK (works) |
| Android native app (Capacitor) | Uses FCM native via Capacitor plugin |
| User denies push permission | Realtime notifications still show modal in-app |

---

### Technical Notes

1. **Capacitor Push Notifications plugin** uses FCM on Android and APNs on iOS - tokens are different format than web tokens but the backend `send-push` function already handles both (FCM v1 API supports both)

2. **The `platform` column** in `user_fcm_tokens` will correctly distinguish between 'web', 'ios', and 'android' tokens

3. **Service workers** are not used in native Capacitor apps - the native notification system handles background delivery

4. **Realtime subscriptions** work identically on web and native because they use WebSocket connections via the Supabase client

