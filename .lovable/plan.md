
# Fix: Block Restrictions Not Enforced in Task Assignment Modal

## Root Cause Analysis

After thorough code review, I identified the issue:

1. **The block check code EXISTS** in `AssignTaskModal.tsx` (lines 53-67)
2. **The realtime subscription IS working** (console logs confirm `blocked_until` is received)
3. **The problem is a React stale closure issue**: When the modal component mounts, it captures the `getUserFamily` function reference. If the state updates AFTER the modal opens, the closure may still reference old state.

Additionally, the current restricted dialog shows a generic message but doesn't include the **block reason** which the user requested.

## Solution

### 1. Fix the Stale Closure Issue in AssignTaskModal

The issue is that `getUserFamily` uses `userFamilies.find()` inside the function, but the component may not re-render when `userFamilies` state changes. We need to ensure the modal ALWAYS checks the latest state.

**Fix**: Add console logging first to confirm the issue, then ensure the modal properly reacts to state changes by using the `open` prop as a dependency to re-evaluate the block status.

**File:** `src/components/modals/AssignTaskModal.tsx`

```tsx
// Add console logging to debug
console.log('[AssignTaskModal] Checking block status:', {
  activeFamilyId,
  userMembership,
  isBlocked: isBlocked(userMembership),
  blockedUntil: userMembership?.blockedUntil,
  blockedReason: userMembership?.blockedReason
});
```

### 2. Show Block Reason in Restricted Dialog

Update the restricted dialog to show WHY the user is blocked, using the `blockedReason` field and `getReasonLabel` utility.

**File:** `src/components/modals/AssignTaskModal.tsx`

```tsx
import { isBlocked, getReasonLabel } from '@/lib/blockUtils';

// In the blocked check:
if (isBlocked(userMembership)) {
  const reasonKey = userMembership?.blockedReason;
  const reasonText = reasonKey ? getReasonLabel(reasonKey as any, t) : '';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('block.restricted')}</DialogTitle>
          <DialogDescription>
            {reasonText 
              ? t('block.blockedWithReason', { reason: reasonText })
              : t('block.cannotAssignTasks')}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Add Missing Translation Key

**File:** `src/i18n/locales/en.json`

```json
{
  "block": {
    "blockedWithReason": "You are blocked in this family for {{reason}} and cannot assign tasks."
  }
}
```

### 4. Force State Re-evaluation When Modal Opens

To fix the stale closure issue, add a `useEffect` that re-evaluates the block status when the modal opens:

**File:** `src/components/modals/AssignTaskModal.tsx`

```tsx
import { useState, useEffect } from "react";

// Inside the component, add:
const [blockedCheck, setBlockedCheck] = useState(false);

// Force re-check when modal opens
useEffect(() => {
  if (open && activeFamilyId) {
    const membership = getUserFamily(activeFamilyId);
    console.log('[AssignTaskModal] Modal opened, checking block:', membership);
    setBlockedCheck(isBlocked(membership));
  }
}, [open, activeFamilyId, getUserFamily]);

// Replace the existing isBlocked check with:
const userMembership = getUserFamily(activeFamilyId);
const userIsBlocked = isBlocked(userMembership);

if (userIsBlocked) {
  // ... restricted dialog
}
```

## Files to Modify

1. `src/components/modals/AssignTaskModal.tsx` - Add console logging, show block reason, fix stale closure
2. `src/i18n/locales/en.json` - Add `blockedWithReason` translation key

## Testing Steps

After implementation:
1. User A blocks User B in a family
2. User B (without refreshing) tries to click "Assign Task"
3. User B should see: "You are blocked in this family for [reason] and cannot assign tasks."
4. User B should NOT see the task assignment form

## Expected Outcome

1. Blocked users see a clear message with the block REASON
2. The modal correctly detects block status even if it was just applied
3. Console logs help debug any remaining issues
