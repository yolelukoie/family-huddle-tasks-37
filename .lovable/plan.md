
# Fix: Add 'reported' Event Type to task_events Constraint

## Root Cause

The `task_events` table has a CHECK constraint that only allows these event types:
- `assigned`
- `accepted`
- `rejected`
- `completed`

When a task is reported, the code tries to insert `event_type: 'reported'` which violates this constraint and fails silently (error is logged but not shown to user).

## Solution

### 1. Database Migration
Alter the CHECK constraint to include `'reported'` as a valid event type:

```sql
ALTER TABLE public.task_events DROP CONSTRAINT task_events_event_type_check;
ALTER TABLE public.task_events ADD CONSTRAINT task_events_event_type_check 
  CHECK (event_type = ANY (ARRAY['assigned'::text, 'accepted'::text, 'rejected'::text, 'completed'::text, 'reported'::text]));
```

---

## Technical Details

| Item | Details |
|------|---------|
| Affected Table | `public.task_events` |
| Constraint Name | `task_events_event_type_check` |
| New Value Added | `'reported'` |

## What This Fixes

After this change:
1. The `task_event` insert with `event_type: 'reported'` will succeed
2. The push notification to the task creator will be sent
3. Creator will receive: "Your task '{name}' was removed because it was reported as: {reason}"

## No Code Changes Required

The code in `ReportContentModal.tsx` is already correct - it just needs the database constraint to allow the `'reported'` event type.
