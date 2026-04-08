# Family Huddle — Project Context

## What This Is

A cross-platform family task management app. Families organize chores, assign tasks to members, earn stars on completion, unlock badges and character progression, set goals, and chat. Runs as a web app and as a native Android app via Capacitor.

Built with Lovable (AI-assisted dev platform). Actively developed — treat recent changes with care.

---

## Commands

```bash
npm run dev          # local dev server (Vite)
npm run build        # production build
npm run build:dev    # dev build
npm run lint         # ESLint
npm run preview      # preview production build
npx tsc --noEmit     # typecheck without emitting
```

No test runner configured. Lint + typecheck are the only automated checks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 7 + SWC |
| Styling | Tailwind CSS + shadcn-ui (Radix UI) |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + auth + realtime + RLS) |
| Push notifications | Firebase Cloud Messaging + Capacitor plugin |
| Mobile | Capacitor 8 (Android) |
| i18n | i18next + react-i18next |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Provider Hierarchy (App.tsx)

Initialization order matters. Outer providers initialize first.

```
TooltipProvider
  BrowserRouter
    ThemeProvider
      AuthProvider          ← auth state (user, session, isLoading)
        CelebrationsProvider ← UI celebration queue
          AppProvider       ← family state (activeFamilyId, userFamilies)
            TasksProvider   ← task/category/template data
              AssignmentModalProvider ← modal open/close state
                DeepLinkHandler  ← Capacitor URL routing (renders null)
                RealtimeRoot     ← calls useRealtimeNotifications (renders null)
                Routes           ← page routing
```

Data hooks that depend on `user` or `activeFamilyId` must guard with `if (!user) return` / `if (!activeFamilyId) return` because auth resolves async after initial render.

---

## Key Source Files

```
src/
├── App.tsx                          Provider tree, routes, DeepLinkHandler
├── lib/
│   ├── types.ts                     All core TypeScript interfaces
│   ├── constants.ts                 ROUTES and other app constants
│   ├── platform.ts                  isPlatform() — detect capacitor/web/ios/android
│   ├── character.ts                 Character stage progression logic
│   ├── badges.ts                    Badge unlock threshold logic
│   └── storage.ts                   Scoped localStorage helpers
├── hooks/
│   ├── useAuth.tsx                  AuthProvider + useAuth() — user, session, signIn/Out
│   ├── useApp.tsx                   AppProvider + useApp() — families, activeFamilyId, stars
│   ├── useTasks.tsx                 Thin wrapper re-exporting TasksContext
│   ├── useGoals.tsx                 Goal CRUD + realtime subscription
│   ├── useBadges.tsx                Badge unlock detection + persistence
│   ├── useChat.tsx                  Chat messages + realtime subscription
│   ├── useRealtimeNotifications.tsx Task assignment notifications + family sync
│   └── useKickedFromFamily.tsx      Block/kick detection via realtime
├── contexts/
│   ├── TasksContext.tsx             Task/category/template CRUD, star delta, badge awarding
│   ├── CelebrationsContext.tsx      Celebration animation queue
│   ├── ThemeContext.tsx             Theme selection
│   └── AssignmentModalContext.tsx   Task assignment modal state
├── integrations/supabase/
│   ├── client.ts                    Supabase client instance
│   └── types.ts                     Auto-generated DB types (do not edit manually)
├── pages/                           One directory per route
└── components/
    ├── ui/                          shadcn-ui primitives (do not edit)
    ├── layout/                      AppLayout, navigation bar
    ├── modals/                      TaskAssignmentModal and others
    ├── tasks/                       Task-specific components
    ├── badges/                      Badge display
    ├── celebrations/                Celebration animation components
    └── character/                   Character display components
```

---

## Core Data Models (src/lib/types.ts)

- **User** — id, displayName, gender, profileComplete, activeFamilyId?, avatar_url?
- **Family** — id, name, inviteCode, createdBy
- **UserFamily** — join table: userId + familyId + totalStars + currentStage + block fields
- **Task** — id, familyId, assignedTo, assignedBy, dueDate, starValue, completed, categoryId
- **TaskTemplate** — reusable task definition within a family
- **TaskCategory** — groups templates; isDefault + isHouseChores flags
- **Goal** — userId, targetStars, targetCategories?, currentStars, completed
- **Badge** — unlocked at star thresholds; persisted in user_badges table
- **ChatMessage** — familyId, userId, content, timestamp
- **CelebrationEvent** — transient UI event (not persisted)

---

## Auth Flow

1. `AuthProvider` calls `supabase.auth.onAuthStateChange()` on mount
2. On `SIGNED_IN` / `INITIAL_SESSION`: calls `loadUserData()` (deferred via `setTimeout(..., 0)`)
3. `loadUserData()` fetches user profile from `users` table, sets `user` state
4. `AppProvider` watches `user` — when non-null, calls `loadFamilyData()`
5. Deep links handled by `DeepLinkHandler` (Capacitor only): `/auth/reset` and `/auth/callback`
6. Password reset uses Supabase deep links → `NativeResetPasswordPage`

---

## Realtime Architecture

All subscriptions follow the same pattern:
```typescript
useEffect(() => {
  if (!user?.id || !activeFamilyId) return;  // guard
  const ch = supabase.channel('unique-name').on(...).subscribe();
  return () => { supabase.removeChannel(ch); };  // cleanup
}, [user?.id, activeFamilyId, ...otherDeps]);
```

**Active subscriptions:**
| Hook | Channel | Watches |
|---|---|---|
| useApp | `family-members-{familyId}` | user_families for active family |
| useGoals | `goals:{userId}:{familyId}` | goals table |
| useChat | `chat-page:{userId}:{familyId}` | chat_messages table |
| useRealtimeNotifications | `task-events:{userId}` | task_events INSERT |
| useRealtimeNotifications | `family-sync:{familyId}` | multiple tables for refresh |
| useKickedFromFamily | `global-membership-updates` | user_families DELETE/UPDATE |

---

## Window Custom Events (Event Bus)

These are used for cross-context communication. All must have both emitters and consumers:

| Event | Emitted by | Consumed by |
|---|---|---|
| `tasks:changed` | TasksContext (all mutations) | TasksContext.loadFamilyTasks, useBadges |
| `badges:changed` | TasksContext.checkAndAwardBadges, useBadges | useBadges.loadPersistedBadges |
| `family:updated` | useKickedFromFamily | **NOBODY** ← known orphaned event |

---

## Known Cross-File Issues (from static analysis)

These are confirmed issues — do not accidentally work around them without fixing the root cause:

1. **Dual badge-awarding paths** — `TasksContext.checkAndAwardBadges()` AND `useBadges.checkForNewBadges()` both insert into `user_badges`. No coordination. Can double-award.

2. **Star delta race** — `applyStarsDelta()` in `useApp` can be called from `TasksContext` concurrently if two task completions happen close together. Relies on Supabase RPC atomicity only.

3. **Orphaned `family:updated` event** — emitted in `useKickedFromFamily` but never consumed anywhere.

4. **Stale closure in `useRealtimeNotifications`** — `openAssignmentModal` (from AssignmentModalContext) is captured in the subscription callback. If the context re-renders and returns a new function reference, the subscription uses the stale reference.

5. **`as any` type escape in `useRealtimeNotifications`** — task object is constructed manually with `as any`, bypassing type safety for DB event payloads.

---

## Do Not Touch

These files/directories must not be edited directly:

| Path | Reason |
|---|---|
| `supabase/migrations/` | Schema changes need Supabase CLI + migration workflow |
| `android/` | Capacitor build artifacts, regenerated by `npx cap sync` |
| `dist/` | Build output |
| `node_modules/` | Package manager only |
| `src/components/ui/` | shadcn-ui primitives — update via `npx shadcn-ui add` |
| `src/integrations/supabase/types.ts` | Auto-generated — regenerate via Supabase CLI |
| `.env`, `.env.*` | Secrets — never commit |
| `package-lock.json` | npm managed |
| `capacitor.config.ts` | Mobile config — high impact change |

---

## Import Alias

`@/` maps to `src/`. All internal imports use this alias.

```typescript
import { useAuth } from "@/hooks/useAuth";
import { Task } from "@/lib/types";
```

---

## PM Interview Protocol

When the user says `pm:` followed by a request, **do NOT launch the PM agent immediately**. First run the interview protocol below. The PM agent cannot interact with the user (it runs as an isolated subprocess), so the main agent must conduct the interview and pass a complete brief.

### Step 1: Classify the request

Identify the request type — it determines which questions to ask:
- **Feature request**: Something new to build (new page, new flow, new capability)
- **Bug fix**: Something broken (symptom, reproduction steps, expected vs actual)
- **Investigation**: Something suspected wrong (area of concern, triggering symptom)
- **Cleanup / optimization**: Reducing debt or improving performance (goal, constraints)

### Step 2: Quick codebase check

Before asking questions, use Read/Glob/Grep to check what already exists in the relevant area. Do not ask the user about something you can discover yourself.

### Step 3: Interview the user

Group ALL questions into a single message. Never ask one question at a time.

**For EVERY request, ask about:**
- **Exact scope**: Which pages, flows, components, or data are affected?
- **Exact behavior**: What should the end result look, feel, and work like — step by step?
- **Priority**: If multiple things are requested, what order?
- **Constraints**: What must NOT change? What is explicitly out of scope?
- **Platform**: Android (Capacitor) only? Web only? Both?
- **Edge cases**: What happens on logout, no network, expired session, first-time use?

**For feature requests, also ask about:**
- User-visible placement (which page? which menu? which button?)
- Persistence (does this setting survive logout? app restart?)
- Permissions (who can use this feature — all users, admins, premium only?)
- Fallback (what happens if the feature fails or is unavailable?)

**For bug fixes, also ask about:**
- Exact reproduction steps
- How often does it happen? Always, or intermittently?
- Which users are affected? All users, or specific conditions?
- Is there a workaround currently?

**Question format:**
```
Before I hand this off to the PM, I need to understand a few things:

1. **[Topic]**: [Question] (this affects [why it matters to the plan])
2. **[Topic]**: [Question] (this affects [...])
3. ...
```

**Stopping criteria:**
- After 2 rounds of questions, stop asking even if gaps remain
- Fill remaining gaps with reasonable defaults and mark them as assumptions

**Contradiction handling:**
If the user says something that contradicts an earlier statement, surface it immediately:
"Earlier you said [X], but now you said [Y]. These conflict — which should I go with?"

### Step 4: Build the technical plan and get approval

Present the plan to the user:

```
## Technical Plan: [Feature/Fix Name]

### What you asked for
[Restate the request in your own words]

### What will change
- [Specific technical change, with the affected file or component named]

### What will NOT change
- [Explicitly out-of-scope items]

### My assumptions
- [Assumption — I assumed X because you did not specify. Correct me if wrong.]

### Success criteria
- [Concrete, testable statement of done]
```

**The user must confirm this plan before the PM agent is launched.**

### Step 5: Launch PM with the complete brief

Once the user approves, launch the PM agent with this exact handoff format:

```
## Pre-Interview Complete — Skip to codebase exploration

### Original request
[What the user said verbatim]

### Request type
[feature / bug fix / investigation / cleanup]

### Interview answers
[All clarified answers from the user, organized by topic]

### Approved technical plan
[The full plan the user approved]

### Assumptions marked by user
[Any defaults the user did not override — PM should treat these as confirmed]

Proceed directly to codebase exploration and agent pipeline selection.
Do NOT re-interview the user. The interview is complete.
```

---

## Agents Available

Three global agents are configured for this project:

**`@pm`** — Product Manager agent. Coordinates the full agent pipeline: selects the right agent team, orchestrates their work in sequence, passes payloads between agents, reports progress, and gets user approval at checkpoints. **Always launched via the PM Interview Protocol above** — never directly.

**`@archaeologist`** — Find dead code AND cross-file inconsistencies. Scans whole project. Read-only. Use before any cleanup PR.

**`@analyst`** — Build cross-reference matrices (mutation map, subscription map, event bus map, auth assumption map) to find race conditions, stale closures, orphaned events, and initialization ordering bugs. Read-only. Use before any fix involving shared state or realtime.

**`@implementer`** — Execute an approved plan. Makes minimal edits, runs lint+typecheck after every file change, produces a handoff summary. Use only after analyst/archaeologist has given you a plan.

Pipeline: **archaeologist/analyst → you review → implementer**

---

## Capacitor / Mobile Notes

- `isPlatform('capacitor')` — true when running as Android app
- `isPlatform('web')` — true in browser
- Capacitor plugins use `addListener()` which looks like unused callbacks to static analysis — they are NOT unused
- `npx cap sync` — syncs web build to Android project after `npm run build`
- Deep links are handled in `DeepLinkHandler` component (see App.tsx)
- Push notifications: FCM token acquired via `@capacitor/push-notifications`, stored in Supabase user profile
