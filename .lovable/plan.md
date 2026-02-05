
# Comprehensive Fix: Block Restrictions Enforcement

## Problem Analysis

After thorough code analysis, I've identified the root cause and all affected areas:

### Root Cause
The blocking system has **two separate data sources** that can become out of sync:

1. **`userFamilies`** - Contains the current user's memberships (used by `getUserFamily()`)
2. **`allFamilyMembers`** - Contains all family members including block status (used by `getFamilyMembers()`)

The block badge shows correctly because it uses `getFamilyMembers()` → `allFamilyMembers`, but access restrictions fail because they use `getUserFamily()` → `userFamilies` which may have stale data.

Additionally, multiple components lack block checks entirely:
- Main page doesn't show block status
- AssignTaskModal has no block check
- TasksPage allows full access

---

## Files to Modify

1. `src/pages/family/FamilyPage.tsx` - Fix members dialog check
2. `src/pages/main/MainPage.tsx` - Show block status, restrict "Assign Task" button
3. `src/pages/tasks/TasksPage.tsx` - Restrict "Assign Task" button
4. `src/components/modals/AssignTaskModal.tsx` - Restrict modal for blocked users
5. `src/hooks/useApp.tsx` - Ensure reliable state sync
6. `src/i18n/locales/en.json` - Add missing translation keys

---

## Implementation Details

### 1. FamilyPage.tsx - Fix Members Dialog Check

**Problem**: The check `userFamilies.find(uf => uf.familyId === family.id)` doesn't use the `getUserFamily()` function which triggers proper state access.

**Solution**: Use `getUserFamily(family.id)` consistently:

```tsx
// Line ~308: Change from:
{!isBlocked(userFamilies.find(uf => uf.familyId === family.id)) ? (

// To:
const currentUserMembership = getUserFamily(family.id);
{!isBlocked(currentUserMembership) ? (
```

Also add `getUserFamily` to the destructured values from `useApp()` (line 25).

### 2. MainPage.tsx - Show Block Status + Restrict Assignment

**Changes needed**:

a) Import block utilities:
```tsx
import { isBlocked, getBlockStatusText } from '@/lib/blockUtils';
```

b) Get user's family membership:
```tsx
const { getUserFamily } = useApp();
const userMembership = activeFamilyId ? getUserFamily(activeFamilyId) : null;
const userIsBlocked = isBlocked(userMembership);
```

c) Show block status next to family name (around line 191):
```tsx
<NavigationHeader 
  title={
    currentFamily?.name 
      ? (userIsBlocked 
          ? `${currentFamily.name} — ${getBlockStatusText(userMembership, t)}` 
          : currentFamily.name)
      : t('main.title')
  } 
  showBackButton={false} 
/>
```

d) Conditionally render or disable "Assign Task" button (around line 311):
```tsx
<Button 
  onClick={() => userIsBlocked ? null : setShowAssignTask(true)} 
  variant="theme" 
  className="h-14"
  disabled={userIsBlocked}
>
  <Plus className="h-5 w-5 mr-2" />
  {userIsBlocked ? t('block.cannotAssignTasks') : t('main.assignTask')}
</Button>
```

### 3. TasksPage.tsx - Restrict Assignment Button

**Changes needed**:

a) Import block utilities and get membership:
```tsx
import { isBlocked } from '@/lib/blockUtils';

const { activeFamilyId, getUserFamily } = useApp();
const userMembership = activeFamilyId ? getUserFamily(activeFamilyId) : null;
const userIsBlocked = isBlocked(userMembership);
```

b) Disable the "Assign Task" button (around line 199-207):
```tsx
<Button 
  onClick={() => setShowAssignTask(true)}
  variant="theme"
  size="lg"
  disabled={userIsBlocked}
>
  <Plus className="h-5 w-5 mr-2" />
  {userIsBlocked ? t('block.cannotAssignTasks') : t('main.assignTask')}
</Button>
```

### 4. AssignTaskModal.tsx - Block Check at Modal Level

**Changes needed**:

a) Import block utilities:
```tsx
import { isBlocked } from '@/lib/blockUtils';
```

b) Add block check after getting user data (around line 49-51):
```tsx
if (!user || !activeFamilyId) return null;

// Check if current user is blocked
const userMembership = activeFamilyId ? getUserFamily(activeFamilyId) : null;
if (isBlocked(userMembership)) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('block.restricted')}</DialogTitle>
          <DialogDescription>{t('block.cannotAssignTasks')}</DialogDescription>
        </DialogHeader>
        <Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
      </DialogContent>
    </Dialog>
  );
}
```

c) Add `getUserFamily` to the destructured values from `useApp()` (line 37).

### 5. useApp.tsx - Ensure Reliable State Sync

**Problem**: The `refreshUserMembership` function may not be called in all cases.

**Solution**: Call `refreshUserMembership` ALSO in `hydrateActiveFamily()` to ensure block status is always current:

```tsx
// In hydrateActiveFamily function, after fetching data:
// Also refresh block status
await refreshUserMembership(activeFamilyId);
```

Additionally, ensure initial load also calls `refreshUserMembership` after setting `userFamilies`:

```tsx
// At end of loadFamilyData(), after setting state:
if (user.activeFamilyId) {
  await refreshUserMembership(user.activeFamilyId);
}
```

### 6. Translation Keys

Add to `src/i18n/locales/en.json`:
```json
{
  "block": {
    "cannotAccessWhileBlocked": "You cannot access this feature while blocked.",
    "blockedInFamily": "Blocked in this family"
  },
  "common": {
    "close": "Close"
  }
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `FamilyPage.tsx` | Use `getUserFamily()` for block check |
| `MainPage.tsx` | Show block status in header, disable Assign Task button |
| `TasksPage.tsx` | Disable Assign Task button when blocked |
| `AssignTaskModal.tsx` | Show restricted dialog when blocked |
| `useApp.tsx` | Call `refreshUserMembership` in `hydrateActiveFamily` |
| `en.json` | Add missing translation keys |

## Testing Checklist

After implementation, test the following scenarios:

1. Block a user → they should immediately:
   - See "BLOCKED for Xm" next to family name on main page
   - Not be able to access Family Members dialog (see "Members list restricted" badge)
   - Not be able to open AssignTaskModal
   - See disabled "Assign Task" buttons
   - See "Chat Access Restricted" on chat page

2. The blocked user should STILL be able to:
   - Complete their own existing tasks
   - View their progress and stars
   - Switch to other families where they're not blocked

3. Unblock the user → restrictions should lift immediately
