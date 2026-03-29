
# Fix: TaskAssignmentModal Accept/Reject Reliability

## Root Cause

`TaskAssignmentModal` used `useTasks()` context methods (`updateTask`, `deleteTask`, `ensureCategoryByName`) which all bail silently when `activeFamilyId` is null/stale on cold start from push. The modal has `task.familyId` but context doesn't use it.

## Fix (3 parts)

### 1. Guarantee familyId on modal open
- Push payload always provides familyId; task fetch uses `intent.familyId` as fallback.
- `AssignmentModalContext` rejects tasks without familyId.
- `AppLayout` foreground handler and intent processor both ensure familyId.

### 2. Direct Supabase in TaskAssignmentModal
- Remove `useTasks()` dependency entirely.
- Accept: direct query for "Assigned" category by `task.familyId`, then `supabase.from('tasks').update(...)` with `.eq('assigned_to', user.id)` guard.
- Reject: `supabase.from('tasks').delete()` with `.eq('assigned_to', user.id)` guard.
- Check rowcount (data array length or single response) — toast error if 0.
- Dispatch `tasks:changed` event after success.

### 3. TasksProvider listens to `tasks:changed`
- Add `useEffect` in `TasksProvider` that listens for `tasks:changed` CustomEvent and calls `loadFamilyTasks()`.
- This ensures the task list refreshes after modal actions regardless of how they were triggered.

### 4. Close NativePushPrompt before modal
- In AppLayout intent processor, `setShowNativePushPrompt(false)` before opening modal.

## Files Changed
- `src/components/modals/TaskAssignmentModal.tsx` — direct Supabase, safety guards
- `src/contexts/AssignmentModalContext.tsx` — reject missing familyId
- `src/contexts/TasksContext.tsx` — listen for `tasks:changed`
- `src/components/layout/AppLayout.tsx` — close push prompt before modal, ensure familyId
