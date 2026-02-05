
# Restrict Blocked Users from Creating Tasks in Default Categories

## Overview

Blocked users should only be able to create tasks in custom (personal) categories, not in default/shared categories. This prevents them from affecting other family members while still allowing personal productivity.

## Categories Classification

| Category Type | Shared? | Blocked User Access |
|---------------|---------|---------------------|
| `isDefault: true` | Yes | Read-only (can see, cannot create) |
| `isHouseChores: true` | Yes | Read-only (can see, cannot create) |
| `isDefault: false` + `isHouseChores: false` | No (personal) | Full access |
| "Assigned" category | Yes | Cannot assign to others (already implemented) |

## Implementation Strategy

### 1. Add Block Check to `addTodayTaskFromTemplate()` (TasksContext.tsx)

When a blocked user clicks on a template to add it to today, check if the template's category is a default category. If so, show an error and prevent the task from being created.

```typescript
const addTodayTaskFromTemplate = useCallback(async (templateId: string) => {
  if (!activeFamilyId || !user) return null;
  
  const template = templates.find(x => x.id === templateId);
  if (!template) return null;
  
  // Check if user is blocked
  const userFamily = getUserFamily(activeFamilyId);
  if (isBlocked(userFamily)) {
    // Find the category for this template
    const category = categories.find(c => c.id === template.categoryId);
    
    // If category is default/shared, block the action
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
}, [activeFamilyId, user, templates, categories, getUserFamily, toast, t]);
```

### 2. Add Block Check to `addTemplate()` (TasksContext.tsx)

When a blocked user tries to create a new template in a default category, prevent it.

```typescript
const addTemplate = useCallback(async (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
  if (!activeFamilyId || !user) return null;
  
  // Check if user is blocked and trying to add to default category
  const userFamily = getUserFamily(activeFamilyId);
  if (isBlocked(userFamily)) {
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
}, [...]);
```

### 3. Hide/Disable UI Elements in Default Categories (TaskCategorySection.tsx)

For blocked users, hide the "Add Task Template" button and disable clicking on templates for default categories. This provides immediate visual feedback.

```tsx
// In TaskCategorySection component
const { getUserFamily } = useApp();
const userFamily = familyId ? getUserFamily(familyId) : null;
const userIsBlocked = isBlocked(userFamily);
const isSharedCategory = category.isDefault || category.isHouseChores;
const canCreateInCategory = !userIsBlocked || !isSharedCategory;

// When rendering template click handler:
<div 
  onClick={() => canCreateInCategory ? handleAddToToday(template) : null}
  className={cn(
    "flex items-center justify-between p-2 border rounded transition-colors",
    canCreateInCategory 
      ? "cursor-pointer hover:bg-accent" 
      : "opacity-60 cursor-not-allowed"
  )}
>
  ...
</div>

// When rendering "Add Task Template" button:
{canCreateInCategory && (
  <Button
    variant="theme"
    size="sm"
    onClick={() => setShowTemplateModal(true)}
  >
    <Plus className="h-3 w-3 mr-2" />
    {t('tasks.addTaskTemplate')}
  </Button>
)}

{/* Show message for blocked users in default categories */}
{!canCreateInCategory && (
  <p className="text-xs text-muted-foreground text-center py-2">
    {t('block.viewOnlyWhileBlocked')}
  </p>
)}
```

### 4. Add Translation Keys (en.json)

```json
{
  "block": {
    "cannotCreateInDefaultCategory": "You cannot create tasks in shared categories while blocked. Use custom categories instead.",
    "viewOnlyWhileBlocked": "View only - cannot add tasks while blocked"
  }
}
```

## Files to Modify

1. **`src/contexts/TasksContext.tsx`** - Add block checks to `addTodayTaskFromTemplate()` and `addTemplate()`
2. **`src/components/tasks/TaskCategorySection.tsx`** - Disable UI for blocked users in default categories
3. **`src/i18n/locales/en.json`** - Add translation keys

## User Experience

### When a blocked user views the Tasks page:

**Default categories (House Chores, Personal Growth, etc.):**
- Templates are visible but grayed out / not clickable
- "Add Task Template" button is hidden
- A subtle message shows "View only - cannot add tasks while blocked"

**Custom categories they created:**
- Full functionality remains
- Can click templates to add to today
- Can create new templates
- Can complete tasks

## Summary

This approach enforces restrictions at multiple layers:
1. **UI layer** - Visual feedback by disabling/hiding buttons
2. **Business logic layer** - Block checks in context functions prevent bypass
3. **Clear messaging** - User understands WHY they can't perform actions

The blocked user can still:
- View all categories and templates
- Create and use custom categories
- Complete their own assigned tasks
- Collect stars and progress their character
