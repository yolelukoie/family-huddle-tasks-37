

# Fix Plan: Store Task Description & Verify Creator Notification

## Overview

This plan addresses two issues:
1. Store task description in reports table (for audit when content is offensive)
2. Ensure task creators receive a notification when their task is reported

---

## Issue 1: Store Task Description in Reports Table

### Current State
- The `reports` table has `content_name` but no field for the task description
- The `ReportContentModal` only receives `contentName` prop, not the description

### Changes Required

#### 1.1 Database Migration
Add a `content_description` column to the `reports` table:

```sql
ALTER TABLE public.reports ADD COLUMN content_description text NULL;
```

#### 1.2 Update ReportContentModal Props
**File:** `src/components/modals/ReportContentModal.tsx`

Add new prop `contentDescription`:
```typescript
interface ReportContentModalProps {
  // ... existing props
  contentDescription?: string;  // NEW
}
```

Update the insert to include description:
```typescript
const { error: reportError } = await supabase.from('reports').insert({
  reporter_id: user.id,
  family_id: familyId,
  content_id: contentId,
  content_type: contentType,
  content_name: contentName && contentName.trim() ? contentName.trim() : null,
  content_description: contentDescription && contentDescription.trim() ? contentDescription.trim() : null, // NEW
  reason,
  details: details.trim() || null,
});
```

#### 1.3 Pass Description from TaskCategorySection
**File:** `src/components/tasks/TaskCategorySection.tsx`

Update the `ReportContentModal` component call to pass the description:
```typescript
<ReportContentModal
  open={!!reportTarget}
  onOpenChange={(open) => !open && setReportTarget(null)}
  contentId={reportTarget?.id || ''}
  contentType="task_template"
  familyId={familyId}
  contentName={reportTarget?.name || ''}
  contentDescription={reportTarget?.description || ''}  // NEW
  createdBy={reportTarget?.createdBy || ''}
  onReported={() => {
    setReportTarget(null);
    onTaskAdded?.();
  }}
/>
```

---

## Issue 2: Creator Notification Verification

### Current State
The notification logic **already exists** in `ReportContentModal.tsx` (lines 96-143):
1. Creates a `task_event` record with `event_type: 'reported'`
2. Calls `send-push` edge function with `recipientId: createdBy`
3. Uses translations that exist in all locale files

### Verification Needed
The logic appears correct. Possible issues that could prevent notifications:
1. `createdBy` prop not being passed correctly
2. User has no FCM token registered
3. Edge function errors (check logs)

### Testing Steps
1. Create a custom task with user A
2. Report that task with user B
3. Verify in Supabase:
   - `task_events` table has a record with `event_type: 'reported'`
   - `reports` table has the report with `content_name` and `content_description`
4. Check edge function logs for send-push invocation
5. Verify user A receives the push notification

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Database migration | Add `content_description` column to `reports` table |
| `src/integrations/supabase/types.ts` | Auto-updated with new column |
| `src/components/modals/ReportContentModal.tsx` | Add `contentDescription` prop and include in insert |
| `src/components/tasks/TaskCategorySection.tsx` | Pass `contentDescription={reportTarget?.description}` |

---

## Implementation Order

1. Run database migration to add `content_description` column
2. Update `ReportContentModal.tsx`:
   - Add `contentDescription` to props interface
   - Include in Supabase insert
3. Update `TaskCategorySection.tsx`:
   - Pass `contentDescription` prop to modal

---

## Testing Checklist

After implementation:
1. Create a custom task template with a name AND description
2. Report that task using a different family member account
3. Verify in Supabase `reports` table:
   - `content_name` contains the task name
   - `content_description` contains the task description
   - `reason` is set correctly
4. Verify the task template is deleted from `task_templates`
5. Verify `task_events` has a record with `event_type: 'reported'`
6. Check edge function logs for push notification attempt
7. Verify the creator receives a push notification with the message:
   - "Your task '{name}' was removed because it was reported as: {reason}"

