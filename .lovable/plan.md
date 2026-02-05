
# Fix: Block Restrictions Not Being Enforced

## Problem Identified
The blocking system updates the database correctly, but the restrictions are not being enforced because:

1. **Stale State Issue**: The `getUserFamily()` function returns from `userFamilies` state, which is only loaded initially or on focus/visibility changes. When another user blocks the current user, the realtime subscription updates `allFamilyMembers` but NOT the current user's own `userFamilies` state.

2. **Missing Realtime Refresh for Self**: The realtime subscription on `user_families` correctly calls `fetchFamilyMembers()`, but this only updates family member profiles - it does NOT refresh the current user's own membership data including block fields.

3. **Result**: `isBlocked(userFamily)` returns `false` because `userFamily.blockedAt` is still `null` in stale local state.

## Solution

### 1. Fix Realtime Subscription to Refresh User's Own Membership
**File:** `src/hooks/useApp.tsx`

Modify the existing realtime subscription to also refresh the current user's `userFamilies` state when their row is updated:

- Add a new function `refreshUserMembership(familyId)` that fetches the current user's membership for a specific family and updates `userFamilies` state
- In the realtime subscription callback, check if the changed row is the current user's row and if so, call `refreshUserMembership()`

This ensures when the current user is blocked, their local state updates immediately.

### 2. Add Block Check to Chat Page (Already Added but Fix State Issue)
**File:** `src/pages/chat/ChatPage.tsx`

The code already has the block check but it's using stale state. Once the realtime refresh is fixed, this will work correctly.

### 3. Add Block Check to Task Assignment
**File:** `src/contexts/TasksContext.tsx`

The code already has the block check in `addTask`. Once the realtime refresh is fixed, this will work correctly.

### 4. Restrict Family Members Access for Blocked Users
**File:** `src/pages/family/FamilyPage.tsx`

Add a block check that prevents blocked users from seeing the family members dialog:

- Check `isBlocked(currentUserFamily)` before rendering the family members button/dialog
- If blocked, hide or disable the members button
- This matches the user requirement: "No access to list"

### 5. Add Console Logging for Debugging
Add console.log statements to trace the block status flow to help debug any remaining issues:

- Log when realtime subscription receives an update
- Log when `getUserFamily()` is called and what it returns
- Log when `isBlocked()` is evaluated

---

## Technical Implementation

### Step 1: Update useApp.tsx - Add Membership Refresh Function

Add a new function after `hydrateActiveFamily`:

```typescript
// Refresh just the current user's membership for a family (for realtime block updates)
const refreshUserMembership = async (familyId: string) => {
  if (!user) return;
  
  console.log('[useApp] refreshUserMembership called for family:', familyId);
  
  const { data, error } = await supabase
    .from('user_families')
    .select('*')
    .eq('user_id', user.id)
    .eq('family_id', familyId)
    .single();
    
  if (error) {
    console.error('[useApp] Error refreshing user membership:', error);
    return;
  }
  
  if (data) {
    console.log('[useApp] Refreshed membership data:', {
      blockedAt: data.blocked_at,
      blockedIndefinite: data.blocked_indefinite
    });
    
    const updated: UserFamily = {
      userId: data.user_id,
      familyId: data.family_id,
      joinedAt: data.joined_at,
      totalStars: data.total_stars,
      currentStage: data.current_stage,
      lastReadTimestamp: data.last_read_timestamp,
      seenCelebrations: data.seen_celebrations,
      blockedAt: data.blocked_at ?? undefined,
      blockedUntil: data.blocked_until ?? undefined,
      blockedIndefinite: data.blocked_indefinite ?? false,
      blockedReason: data.blocked_reason ?? undefined,
      blockedBy: data.blocked_by ?? undefined,
    };
    
    setUserFamilies(prev => 
      prev.map(uf => 
        uf.familyId === familyId && uf.userId === user.id 
          ? updated 
          : uf
      )
    );
  }
};
```

### Step 2: Update Realtime Subscription

Modify the existing realtime subscription (around line 77-89) to also refresh the current user's membership:

```typescript
useEffect(() => {
  if (!activeFamilyId || !user) return;
  
  const ch = supabase
    .channel(`family-members-${activeFamilyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_families',
      filter: `family_id=eq.${activeFamilyId}`
    }, (payload) => {
      console.log('[useApp] Realtime user_families update:', payload);
      
      // Refresh family members for all users
      fetchFamilyMembers(activeFamilyId);
      
      // If the update was for the current user, also refresh their membership state
      const updatedRow = (payload as any).new || (payload as any).old;
      if (updatedRow && updatedRow.user_id === user.id) {
        console.log('[useApp] Update affects current user, refreshing membership');
        refreshUserMembership(activeFamilyId);
      }
    })
    .subscribe();
    
  return () => { supabase.removeChannel(ch); };
}, [activeFamilyId, user]);
```

### Step 3: Hide Family Members Dialog for Blocked Users

In `FamilyPage.tsx`, wrap the family members dialog trigger in a block check:

```tsx
{/* Only show Members button if user is NOT blocked */}
{!isBlocked(userFamilies.find(uf => uf.familyId === family.id)) && (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="theme" size="sm">
        <Users className="h-4 w-4 mr-1" />
        <span className="sm:hidden">{t('family.members')}</span>
      </Button>
    </DialogTrigger>
    {/* ... dialog content ... */}
  </Dialog>
)}

{/* Show blocked message instead */}
{isBlocked(userFamilies.find(uf => uf.familyId === family.id)) && (
  <Badge variant="destructive" className="text-xs">
    {t('block.noMembersAccess')}
  </Badge>
)}
```

### Step 4: Add Translation Keys

Add to `src/i18n/locales/en.json`:

```json
{
  "block": {
    "noMembersAccess": "Members list restricted"
  }
}
```

---

## Files to Modify

1. `src/hooks/useApp.tsx` - Add realtime refresh for current user's membership
2. `src/pages/family/FamilyPage.tsx` - Hide members dialog for blocked users
3. `src/i18n/locales/en.json` - Add translation for members restriction

## Expected Outcome

1. When a user is blocked, their local state updates immediately via realtime subscription
2. Blocked users cannot access the Chat page (shows restricted screen)
3. Blocked users can still complete their own assigned tasks
4. Blocked users cannot assign tasks to others (toast error)
5. Blocked users cannot see the family members list (dialog is hidden)
6. Console logs help trace the block flow for debugging
