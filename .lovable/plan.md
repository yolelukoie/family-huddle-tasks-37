
# Fix: Block Restrictions Not Working for Task Creation in Default Categories

## Root Cause Analysis

After thorough code review, I've identified **two issues**:

### Issue 1: Stale Closure in TasksContext
The `addTodayTaskFromTemplate` and `addTemplate` functions in `TasksContext.tsx` use `getUserFamily` from `useApp` hook. However, these functions are wrapped in `useCallback` which captures the function reference. When block status changes:
- The `useApp` state updates correctly
- But `TasksContext` callbacks may still use a stale `getUserFamily` reference that reads old state

### Issue 2: UI Component May Have Stale State
The `TaskCategorySection` component checks block status at render time, but if the component doesn't re-render when block status changes, the check will be stale.

## Solution: Multi-Layer Defense

### Layer 1: Fetch Fresh Data in TasksContext (Lines 597-609)

Instead of relying on `getUserFamily` which may be stale, fetch the membership data directly from Supabase at the time of the action:

**File: `src/contexts/TasksContext.tsx`**

```typescript
const addTodayTaskFromTemplate = useCallback(async (templateId: string) => {
  if (!activeFamilyId || !user) return null;

  const template = templates.find(x => x.id === templateId);
  if (!template) {
    console.error('Template not found for Today:', templateId);
    return null;
  }

  // FRESH fetch of membership to check block status (not relying on cached state)
  const { data: freshMembership, error: membershipError } = await supabase
    .from('user_families')
    .select('blocked_at, blocked_until, blocked_indefinite')
    .eq('user_id', user.id)
    .eq('family_id', activeFamilyId)
    .single();

  if (membershipError) {
    console.error('Error fetching membership:', membershipError);
  }

  // Check if user is blocked using fresh data
  const isUserBlocked = !!(
    freshMembership?.blocked_indefinite || 
    (freshMembership?.blocked_until && new Date(freshMembership.blocked_until) > new Date())
  );

  if (isUserBlocked) {
    const category = categories.find(c => c.id === template.categoryId);
    if (category?.isDefault || category?.isHouseChores) {
      console.log('[TasksContext] BLOCKED: User attempted to create task in default category');
      toast({
        title: t('block.restricted'),
        description: t('block.cannotCreateInDefaultCategory'),
        variant: 'destructive',
      });
      return null;
    }
  }

  // ... rest of the function
}, [activeFamilyId, user, templates, categories, toast, t]);
```

### Layer 2: Same Fix for `addTemplate` (Lines 503-518)

Apply the same fresh-fetch pattern to `addTemplate`:

```typescript
const addTemplate = useCallback(async (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
  if (!activeFamilyId || !user) return null;

  // FRESH fetch of membership to check block status
  const { data: freshMembership } = await supabase
    .from('user_families')
    .select('blocked_at, blocked_until, blocked_indefinite')
    .eq('user_id', user.id)
    .eq('family_id', activeFamilyId)
    .single();

  const isUserBlocked = !!(
    freshMembership?.blocked_indefinite || 
    (freshMembership?.blocked_until && new Date(freshMembership.blocked_until) > new Date())
  );

  if (isUserBlocked) {
    const category = categories.find(c => c.id === template.categoryId);
    if (category?.isDefault || category?.isHouseChores) {
      toast({
        title: t('block.restricted'),
        description: t('block.cannotCreateInDefaultCategory'),
        variant: 'destructive',
      });
      return null;
    }
  }

  // ... rest of the function
}, [activeFamilyId, user, templates, categories, toast, t]);
```

### Layer 3: Create Helper Function for Reuse

To avoid code duplication, create a helper function:

```typescript
// Inside TasksProvider, before the callbacks:
const checkUserBlocked = async (): Promise<boolean> => {
  if (!activeFamilyId || !user) return false;
  
  const { data } = await supabase
    .from('user_families')
    .select('blocked_until, blocked_indefinite')
    .eq('user_id', user.id)
    .eq('family_id', activeFamilyId)
    .single();
    
  return !!(
    data?.blocked_indefinite || 
    (data?.blocked_until && new Date(data.blocked_until) > new Date())
  );
};
```

## Files to Modify

1. **`src/contexts/TasksContext.tsx`**
   - Add `checkUserBlocked` helper function
   - Update `addTodayTaskFromTemplate` to use fresh DB check
   - Update `addTemplate` to use fresh DB check
   - Remove dependency on `getUserFamily` for these functions

## Why This Works

1. **Fresh Data**: Every time a blocked user tries to create a task, we query the database directly for their current block status
2. **No Stale Closures**: We don't rely on React state that may be stale in callback closures
3. **Authoritative Source**: The database is the single source of truth for block status
4. **UI Still Works**: The UI restrictions in `TaskCategorySection` provide immediate visual feedback, but the backend check is the enforcement layer

## Testing Checklist

After implementation:
1. User A blocks User B
2. User B (without refreshing) navigates to Tasks page
3. User B clicks on a template in "House Chores" category
4. Expected: Toast appears with "You cannot create tasks in shared categories while blocked"
5. Expected: No task is created
6. User B creates a custom category and adds a template
7. Expected: Task IS created successfully (custom categories are allowed)
