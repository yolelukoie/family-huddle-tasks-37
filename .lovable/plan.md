
## Issue 1: Status Bar Overlap on Android

### Problem
The app content extends under the system status bar on Android, making the top menu (navigation header with "The House of Chores", user avatar) difficult to click. You can see in your screenshot that the header overlaps with the phone's status bar (time, battery, etc).

### Root Cause
Android uses an edge-to-edge display by default on modern devices. The app currently has no padding to account for the system status bar. While `viewport-fit=cover` is set in index.html, no CSS safe area insets are applied.

### How Other Apps Handle This
Native and hybrid apps use **safe area insets** - padding that respects the system UI areas (status bar, navigation bar, notches, etc.). For Capacitor apps, this is typically done by:

1. **Applying `env(safe-area-inset-top)` CSS** to the root layout or header
2. **Using the `@capacitor/status-bar` plugin** to configure status bar behavior
3. **Setting transparent status bar overlay** in Android styles

### Solution
1. **Add CSS safe area padding** to `src/index.css`:
   ```css
   body {
     padding-top: env(safe-area-inset-top);
     padding-bottom: env(safe-area-inset-bottom);
   }
   ```

2. **Update NavigationHeader.tsx** to include safe area inset in sticky positioning:
   ```css
   top: env(safe-area-inset-top)
   ```

3. **Update Android styles.xml** to use a theme that supports edge-to-edge with proper inset handling:
   ```xml
   <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
   <item name="android:fitsSystemWindows">true</item>
   ```

4. **Optionally install `@capacitor/status-bar`** for more control over status bar color/visibility

---

## Issue 2: Badge Events Firing Twice After Second Badge

### Problem
After receiving the second badge, badge celebrations/events fire twice.

### Root Cause - Duplicate Badge Checking Logic
Looking at the code, there are **TWO places** that check for new badges and trigger celebrations:

1. **`TasksContext.tsx` (lines 43-119)**: `checkAndAwardBadges()` - Called when a task is completed (line 326)

2. **`MainPage.tsx` (line 118)**: `checkForNewBadges()` - Called in a `useEffect` when `totalStars` changes

**The flow causing duplication:**
1. User completes a task
2. `TasksContext.updateTask()` calls `checkAndAwardBadges()` → Triggers badge celebration
3. Stars are updated, causing `totalStars` to change
4. `MainPage.useEffect` detects star change and calls `checkForNewBadges()` → Triggers badge celebration again

The memory note mentions: *"Badge checking and star-based milestone celebrations are centralized in TasksContext.tsx"* - but the code still has duplicate logic in `MainPage.tsx`.

### Why It Works for the First Badge
The first badge is marked as `seen: true` immediately after the celebration is queued (lines 186-196 in `useBadges.tsx`). However, there's a race condition:
- Both checks run nearly simultaneously
- The first one inserts the badge and queues celebration
- The second one runs before `seen: true` is persisted, sees the badge as unseen, and queues again

### Solution
Remove the duplicate badge checking from `MainPage.tsx` since `TasksContext.tsx` already handles badge awarding centrally. The `useEffect` in MainPage should only handle:
- Milestone celebrations (1000 stars reset)
- NOT badge checking (already done in TasksContext)

**Change MainPage.tsx line 118:**
```typescript
// BEFORE:
checkForNewBadges(previousStars, totalStars);

// AFTER:
// Badge checking is centralized in TasksContext - no need to call here
// The checkAndAwardBadges in TasksContext already handles this when tasks are completed
```

---

## Files to Modify

| File | Issue | Change |
|------|-------|--------|
| `src/index.css` | Status bar | Add `padding-top: env(safe-area-inset-top)` to body |
| `src/components/layout/NavigationHeader.tsx` | Status bar | Add safe area inset to sticky header positioning |
| `android/app/src/main/res/values/styles.xml` | Status bar | Add `fitsSystemWindows` and cutout mode |
| `src/pages/main/MainPage.tsx` | Duplicate badges | Remove `checkForNewBadges` call from useEffect |
| `supabase/functions/send-push/index.ts` | Build error | Fix type error on line 208 |
| `supabase/functions/upload-character-images/index.ts` | Build error | Fix unknown error type on line 45 |

---

## Build Errors to Fix

Two TypeScript errors in edge functions need to be fixed:

1. **send-push/index.ts:208** - `e?.message` - `e` is typed as `{}`, needs type assertion
2. **upload-character-images/index.ts:45** - `error.message` - `error` is of type `unknown`, needs type guard

---

## Technical Summary

The safe area issue is a common Capacitor/Android problem solved by respecting system insets. The duplicate badge issue is a race condition between two independent badge-checking systems that should be unified (which was the intent per the memory note, but MainPage still has legacy code).
