
# Fix: Block Restrictions and Badge Positioning

## Overview
The blocking system shows the "BLOCKED" badge but doesn't actually restrict the blocked user's actions. This plan fixes the badge positioning and implements proper access restrictions.

## Changes

### 1. Fix Badge Positioning in FamilyPage.tsx
**File:** `src/pages/family/FamilyPage.tsx`

Restructure the member row layout for better visual hierarchy:
- Place badge inline with member name in a flex container
- Use `shrink-0` to prevent badge from being truncated
- Add proper gap spacing between name and badge

```tsx
<div className="flex flex-col">
  <div className="flex items-center gap-2">
    <span className="font-medium truncate">
      {memberProfile?.displayName || t('memberProfile.defaultMemberName')}
    </span>
    {isCurrentUser && (
      <Badge variant="secondary" className="shrink-0">{t('family.you')}</Badge>
    )}
    {isBlocked(member) && (
      <Badge variant="destructive" className="shrink-0 text-xs">
        {getBlockStatusText(member, t)}
      </Badge>
    )}
  </div>
  <div className="text-sm text-muted-foreground">...</div>
</div>
```

### 2. Block Entire Chat Page for Blocked Users
**File:** `src/pages/chat/ChatPage.tsx`

Add a block check at the top of the component that renders a "blocked" screen instead of the chat:

1. Import `isBlocked` from `@/lib/blockUtils`
2. Get current user's membership via `useApp().getUserFamily(activeFamilyId)`
3. Check `isBlocked(userFamily)` early in the render
4. If blocked, show a restricted access card with:
   - Ban icon
   - "Chat Access Restricted" title
   - Message explaining they're blocked
   - Button to go to Family page

```tsx
import { isBlocked } from '@/lib/blockUtils';

// Inside component, after user/activeFamilyId checks:
const { getUserFamily } = useApp();
const userFamily = activeFamilyId ? getUserFamily(activeFamilyId) : null;

if (isBlocked(userFamily)) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={t('chat.title')} />
      <div className="max-w-4xl mx-auto p-4">
        <Card accent>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ban className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t('block.chatRestricted')}</h2>
            <p className="text-muted-foreground text-center mb-4">
              {t('block.cannotAccessWhileBlocked')}
            </p>
            <Button onClick={() => navigate(ROUTES.family)}>
              {t('nav.family')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 3. Block Task Assignment (Not Self-Tasks)
**File:** `src/contexts/TasksContext.tsx`

In the `addTask` function, add a check that allows self-assigned tasks but blocks assigning to others:

1. Import `isBlocked` from `@/lib/blockUtils`
2. Get the user's family membership
3. If blocked AND `assignedTo !== user.id`, show error toast and return null
4. Self-assigned tasks (`assignedTo === user.id`) are always allowed

```tsx
// In addTask, after the activeFamilyId/user checks:
const userFamily = getUserFamily(activeFamilyId);
if (isBlocked(userFamily)) {
  // Allow self-assigned tasks
  const targetUser = task.assignedTo ?? user.id;
  if (targetUser !== user.id) {
    toast({
      title: t('block.restricted'),
      description: t('block.cannotAssignTasks'),
      variant: 'destructive',
    });
    return null;
  }
}
```

### 4. Add Translation Keys
**File:** `src/i18n/locales/en.json`

Add new keys to the `block` section:

```json
{
  "block": {
    ...existing keys...
    "restricted": "Action Restricted",
    "chatRestricted": "Chat Access Restricted",
    "cannotAssignTasks": "You are blocked and cannot assign tasks to other family members."
  }
}
```

## Files to Modify
1. `src/pages/family/FamilyPage.tsx` - Badge positioning fix
2. `src/pages/chat/ChatPage.tsx` - Block entire page for blocked users
3. `src/contexts/TasksContext.tsx` - Block task assignment (allow self-tasks)
4. `src/i18n/locales/en.json` - Add restriction translation keys

## Expected Outcome
1. BLOCKED badge displays inline with member name, cleanly positioned
2. Blocked users see a "Chat Access Restricted" screen instead of chat
3. Blocked users can still create tasks for themselves
4. Blocked users cannot assign tasks to other family members
5. Clear error messages in the user's language
