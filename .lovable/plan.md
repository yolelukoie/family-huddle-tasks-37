
# Fix Plan: Report System Improvements

## Overview

This plan addresses five issues with the task reporting system:

1. Default tasks should not show the "Report" option
2. Reported tasks should be deleted from the database
3. Task creators should receive a notification when their task is reported
4. Remove unused `status` column from reports table
5. Add task name to reports table for audit purposes

---

## Problem 1: Default Tasks Showing Report Option

**Current behavior**: All tasks show the 3-dots menu with "Report" option, including default tasks like "Clean the room", "Do the dishes", etc.

**Fix**: Add a condition to only show the 3-dots menu for non-default tasks, OR only show the Report option for non-default tasks.

### File: `src/components/tasks/TaskCategorySection.tsx`

**Change**: Wrap the DropdownMenu in a condition that checks if the template is not default. For default tasks, no menu is needed since they cannot be deleted or reported.

```text
BEFORE (lines 122-152):
<DropdownMenu>
  <DropdownMenuTrigger>...</DropdownMenuTrigger>
  <DropdownMenuContent>
    {template.isDeletable && !template.isDefault && (...Delete...)}
    <DropdownMenuItem onClick={Report}>...</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

AFTER:
{!template.isDefault && (
  <DropdownMenu>
    <DropdownMenuTrigger>...</DropdownMenuTrigger>
    <DropdownMenuContent>
      {template.isDeletable && (...Delete...)}
      <DropdownMenuItem onClick={Report}>...</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

---

## Problem 2: Reported Tasks Should Be Deleted

**Current behavior**: When a task is reported, only a report record is created. The task remains visible to everyone.

**Fix**: After successfully inserting the report, also delete the task template from the database.

### File: `src/components/modals/ReportContentModal.tsx`

**Changes**:
1. Pass additional prop `templateName` to the modal (for storing in reports table)
2. Pass `createdBy` (the task creator's user ID) for notification purposes
3. After inserting the report, delete the task template
4. Insert a notification event for the task creator

### File: `src/components/tasks/TaskCategorySection.tsx`

**Changes**:
- Pass `templateName={template.name}` and `createdBy={template.createdBy}` to `ReportContentModal`

---

## Problem 3: Notify Task Creator When Reported

**Current behavior**: Task creators don't know their task was deleted due to a report.

**Fix**: After deleting the reported task, send a push notification and create a `task_events` record to notify the creator.

### File: `src/components/modals/ReportContentModal.tsx`

**Logic to add in `handleSubmit`**:

```text
1. Insert report (existing)
2. Delete the task_template from Supabase
3. Create task_event record for the creator with event_type = "reported"
4. Call send-push edge function to notify the creator
5. Show success toast and trigger UI refresh
```

**Notification message format**:
- Title: "Task removed"
- Body: "Your task '{task name}' was removed because it was reported as: {reason}"

### Translation keys to add:
- `notification.taskReported`: "Task removed"
- `notification.taskReportedBody`: "Your task '{{name}}' was removed because it was reported as: {{reason}}"

---

## Problem 4: Remove `status` Column from Reports Table

**Current behavior**: The `reports` table has a `status` column that is not used.

**Fix**: Create a database migration to drop the `status` column.

### Migration SQL:
```sql
ALTER TABLE public.reports DROP COLUMN IF EXISTS status;
```

---

## Problem 5: Add Task Name to Reports Table

**Current behavior**: The `reports` table only stores `content_id` but not the task name, making it harder to review reports if the task is deleted.

**Fix**: Add a `content_name` column to store the task name at the time of reporting.

### Migration SQL:
```sql
ALTER TABLE public.reports ADD COLUMN content_name text NULL;
```

### File: `src/components/modals/ReportContentModal.tsx`

**Change**: Include `content_name` in the insert:
```typescript
await supabase.from('reports').insert({
  reporter_id: user.id,
  family_id: familyId,
  content_id: contentId,
  content_type: contentType,
  content_name: templateName, // NEW
  reason,
  details: details.trim() || null,
});
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `supabase/migrations/...` | Drop `status` column, add `content_name` column |
| `src/integrations/supabase/types.ts` | Update Reports type (auto-generated) |
| `src/components/modals/ReportContentModal.tsx` | Add props for `templateName` and `createdBy`, delete template after report, send notification to creator |
| `src/components/tasks/TaskCategorySection.tsx` | Hide 3-dots menu for default tasks, pass new props to ReportContentModal |
| `src/i18n/locales/*.json` | Add translation keys for report notification |

---

## Flow Diagram

```text
User clicks Report on custom task
         │
         ▼
   Report Modal opens
         │
         ▼
  User selects reason
         │
         ▼
  User clicks "Report"
         │
         ▼
┌────────────────────────────────┐
│ 1. Insert into reports table   │
│    (with content_name)         │
├────────────────────────────────┤
│ 2. Delete task_template        │
├────────────────────────────────┤
│ 3. Insert task_event           │
│    (type: "reported")          │
├────────────────────────────────┤
│ 4. Call send-push function     │
│    (notify creator)            │
├────────────────────────────────┤
│ 5. Show success toast          │
│ 6. Refresh UI (onReported)     │
└────────────────────────────────┘
```

---

## Testing Checklist

After implementation:

1. Verify default tasks (Clean the room, Do the dishes, etc.) do NOT show the 3-dots menu
2. Verify custom tasks still show the 3-dots menu with Delete and Report options
3. Report a custom task and verify:
   - Report is created in `reports` table with `content_name`
   - Task template is deleted from `task_templates` table
   - Task disappears from UI
   - Creator receives a push notification
4. Verify the `reports` table no longer has the `status` column
5. Verify all translations work in different languages
