

## Complete Fix: Task Assignment Modal Flow

### Problem Analysis

Based on your screenshots and the database query, I found **TWO separate issues**:

#### Issue 1: Stale FCM Tokens (The Root Cause of Wrong User Getting Notifications)

From the database:
```
User: 62e9c60d... → Token: dm1NBKNThf2F... (laptop) - Updated: Jan 26
User: 4b68072a... → Token: dm1NBKNThf2F... (SAME laptop token!) - Updated: Jan 26
```

**The same FCM token is registered for BOTH users!** This happens because:
1. You logged into User A on the laptop → laptop's FCM token saved for User A
2. You logged out of User A, logged into User B on the same laptop → same laptop token saved for User B
3. But User A's old token was never deleted!
4. Now when sending a notification to User A, the edge function finds the laptop's token (most recent for User A)
5. But User B is currently logged into the laptop, so User B receives the notification!

**Current behavior**: Tokens are ADDED on login but NEVER REMOVED on logout.

#### Issue 2: Modal Shows for Sender (Even if FCM Was Working)

Looking at the FCM handler in `AppLayout.tsx` (lines 76-111):
```typescript
if (eventType === 'assigned') {
  // Opens modal for ANYONE who receives the FCM message
  // NO CHECK if current user is the assignee!
  openAssignmentModal(taskForModal);
}
```

And in `useRealtimeNotifications.tsx` (lines 84-143):
```typescript
if (row.event_type === 'assigned') {
  // Also opens modal without checking if user is the assignee
  openAssignmentModal(taskForModal);
}
```

**Neither handler checks if `task.assigned_to === user.id` before opening the modal!**

---

### What's Actually Working

| Component | Status | Notes |
|-----------|--------|-------|
| Task creation & assignment | Working | Database records created correctly |
| task_events INSERT | Working | Events are being created |
| Realtime subscription | Working | Events are received (but by wrong user due to token issue) |
| FCM push delivery | Working | Messages delivered (but to wrong device) |
| TaskAssignmentModal component | Working | Renders correctly when opened |
| Accept/Reject handlers | Working | Correctly notify assigner, update task |
| Star attribution | Working | Stars go to the completer |

---

### Required Fixes

#### Fix 1: Delete FCM Token on Logout

**File: `src/lib/fcm.ts`**

Add a new function to delete the user's FCM token from the database when they log out:

```typescript
export async function deleteFcmToken(userId: string): Promise<void> {
  const token = await getCurrentFcmToken();
  if (token) {
    await supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);
  }
}
```

**File: `src/hooks/useAuth.tsx`**

Call the new function in `signOut`:

```typescript
const signOut = useCallback(async () => {
  try {
    // Delete FCM token before signing out
    if (session?.user?.id) {
      await deleteFcmToken(session.user.id);
    }
    await supabase.auth.signOut({ scope: "global" });
  } finally {
    setUser(null);
    setSession(null);
    window.location.assign("/auth");
  }
}, [session]);
```

#### Fix 2: Add Assignee Check Before Opening Modal

**File: `src/components/layout/AppLayout.tsx`** (FCM Handler)

Add check after fetching the task:

```typescript
if (task && !error) {
  // CRITICAL: Only show modal if current user is the ASSIGNEE
  if (task.assigned_to !== user?.id) {
    console.log('[FCM-DEBUG] Ignoring - current user is not the assignee');
    return;
  }
  // ... rest of modal opening code
}
```

**File: `src/hooks/useRealtimeNotifications.tsx`** (Realtime Handler)

Same check:

```typescript
if (data && !error) {
  // CRITICAL: Only show modal if current user is the ASSIGNEE
  if (data.assigned_to !== user.id) {
    console.log('[REALTIME] Ignoring - current user is not the assignee');
    return;
  }
  // ... rest of modal opening code
}
```

#### Fix 3: Defense in Depth - Modal Component

**File: `src/components/modals/TaskAssignmentModal.tsx`**

Add safety check at the top:

```typescript
if (!task || !user) return null;

// Safety: Only render for the actual assignee
if (task.assignedTo !== user.id) {
  console.warn('[TaskAssignmentModal] User is not the assignee, not rendering');
  return null;
}
```

---

### Updated Flow After Fixes

```text
User A (Sender - Phone)                    User B (Assignee - Laptop)
    |                                              |
    |-- Creates task assigned to User B -------->  |
    |   (task_events INSERT for User B)            |
    |                                              |
    |                                      [Realtime: task_events INSERT]
    |                                      [Check: assigned_to === user.id? YES]
    |                                      [Opens Accept/Reject Modal]
    |                                              |
    |                                      [If ACCEPT]
    |<-- task_events INSERT (accepted) ------------|
    |<-- send-push (to User A's PHONE token) -----|
    |   Toast: "User B accepted the task"          |
    |                                      Task in B's "Today's Tasks"
    |                                              |
    |                                      [When B completes task]
    |<-- task_events INSERT (completed) ----------|
    |<-- send-push (to User A's PHONE token) -----|
    |   Toast: "User B completed the task"         |
```

---

### Cleanup: Remove Debug Logs

After confirming the fix works, remove all `[MODAL-DEBUG]`, `[FCM-DEBUG]`, and `[REALTIME-DEBUG]` console.log statements from:
- `src/components/layout/AppLayout.tsx`
- `src/hooks/useRealtimeNotifications.tsx`
- `src/contexts/AssignmentModalContext.tsx`
- `src/components/modals/TaskAssignmentModal.tsx`

---

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/fcm.ts` | Add `deleteFcmToken()` and helper `getCurrentFcmToken()` |
| `src/hooks/useAuth.tsx` | Call `deleteFcmToken()` in `signOut` |
| `src/components/layout/AppLayout.tsx` | Add assignee check before opening modal |
| `src/hooks/useRealtimeNotifications.tsx` | Add assignee check before opening modal |
| `src/components/modals/TaskAssignmentModal.tsx` | Add defense-in-depth assignee check |

---

### Testing Checklist

After implementation:

1. **Log out User A from laptop** → Verify token is deleted from `user_fcm_tokens`
2. **Log in User B on laptop** → New token saved for User B only
3. **User A assigns task to User B** → 
   - User A should NOT see the Accept/Reject modal
   - User B should see the Accept/Reject modal immediately
4. **User B accepts** → User A gets toast notification on phone
5. **User B completes** → User A gets toast notification on phone

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User assigns task to themselves | No modal (self-assign sets status='active' directly) |
| Both users on same device sequentially | Only the currently logged-in user's token is active |
| Realtime and FCM both trigger | Assignee check prevents wrong user, deduplication prevents double modal |
| User has no FCM token | Realtime notifications still work, push fails gracefully |
| User logged in on multiple devices | Latest token wins for push, realtime works on all |

