

# Fix Plan: Family Name Update and Share Invite Code Issues

## Problems Identified

### Problem 1: Family Name Change Not Working
**Root Cause:** The `handleUpdateFamilyName` function in `FamilyPage.tsx` is NOT async and doesn't `await` the `updateFamilyName()` call. Additionally, after updating the database, the local state in `families` array updates correctly, but the UI might not reflect changes because:
- The dialog doesn't close after successful update
- There's no data refetch to ensure all family members see the new name

**Location:** `src/pages/family/FamilyPage.tsx` lines 101-120

```typescript
// Current code (broken):
const handleUpdateFamilyName = (e: React.FormEvent) => {  // NOT async
  e.preventDefault();
  if (!editingFamilyId || !editingFamilyName.trim()) return;
  try {
    updateFamilyName(editingFamilyId, editingFamilyName.trim());  // NOT awaited
    // ...
```

### Problem 2: Share Invite Code Button Loading Forever
**Root Cause:** The issue is in the database realtime subscription filter syntax in `useGoals.tsx`. The filter:
```typescript
filter: `user_id=eq.${user.id}&family_id=eq.${activeFamilyId}`
```

This is causing database errors when Postgres tries to parse the invalid UUID format. The error logs show:
```
"invalid input syntax for type uuid: "1ab0013a-bdc6-4b44-b076-c5b09dfb7118&family_id=eq.68b54838-a2f5-43b5-a409-5081b38c1c65""
```

Supabase Realtime does NOT support multiple filter conditions combined with `&`. The share button loading forever could be a result of ongoing database errors affecting the session.

---

## Implementation Plan

### Step 1: Fix Family Name Update Handler
**File:** `src/pages/family/FamilyPage.tsx`

Make `handleUpdateFamilyName` an async function and properly await the database update:

```typescript
const handleUpdateFamilyName = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingFamilyId || !editingFamilyName.trim()) return;

  try {
    await updateFamilyName(editingFamilyId, editingFamilyName.trim());
    setEditingFamilyId(null);
    setEditingFamilyName('');
    toast({
      title: t('family.nameUpdated'),
      description: t('family.nameUpdatedDesc'),
    });
  } catch (error) {
    console.error('Error updating family name:', error);
    toast({
      title: t('family.errorUpdatingName'),
      description: t('family.errorUpdatingNameDesc'),
      variant: "destructive",
    });
  }
};
```

### Step 2: Fix Realtime Filter in useGoals
**File:** `src/hooks/useGoals.tsx`

Supabase Realtime only supports filtering on a single column. Change from combined filter to just `user_id`:

```typescript
// Before (broken):
filter: `user_id=eq.${user.id}&family_id=eq.${activeFamilyId}`

// After (working):
filter: `user_id=eq.${user.id}`
```

The client-side `loadGoals()` function already filters by both `user_id` AND `family_id`, so we still get correct data - we just listen for all changes to the user's goals and then reload the filtered data.

### Step 3: Refetch Family Data After Name Update
**File:** `src/hooks/useApp.tsx`

In the `updateFamilyName` function, add a call to refresh family data to ensure consistency for all family members:

```typescript
const updateFamilyName = async (familyId: string, name: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('families')
      .update({ name })
      .eq('id', familyId);

    if (error) {
      console.error('Error updating family name in Supabase:', error);
      throw error;
    }

    // Immediately update local state
    setFamilies(prev => prev.map(f => 
      f.id === familyId ? { ...f, name } : f
    ));

    // Also update localStorage as backup
    storage.updateFamily(familyId, { name });
    
    // Dispatch event to trigger refetch in other components
    window.dispatchEvent(new CustomEvent('family:updated'));
  } catch (error) {
    console.error('Failed to update family name:', error);
    throw error;
  }
};
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/family/FamilyPage.tsx` | Make `handleUpdateFamilyName` async and await the update |
| `src/hooks/useGoals.tsx` | Fix invalid realtime filter (remove multi-column filter) |
| `src/hooks/useApp.tsx` | Dispatch event after name update for consistency |

---

## Testing Checklist

After implementation:
1. **Test Family Name Change:**
   - Open the Edit dialog for your family
   - Change the name and click Update
   - Verify the name changes immediately in the UI
   - Verify the name is updated in Supabase (check database)
   - If possible, verify another family member sees the change

2. **Test Share Invite Code:**
   - Click the "Share" button on your active family
   - Verify a new code is generated
   - Verify the toast appears with "24 hours" message
   - Verify the code is copied to clipboard

3. **Check Console:**
   - Verify no more "invalid input syntax for type uuid" errors appear

