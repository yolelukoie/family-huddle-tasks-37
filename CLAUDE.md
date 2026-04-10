# Family Huddle — Project Context

## What This Is

A cross-platform family task management app. Families organize chores, assign tasks to members, earn stars on completion, unlock badges and character progression, set goals, and chat. Runs as a web app and as a native Android app via Capacitor.

Built with Lovable (AI-assisted dev platform). Actively developed — treat recent changes with care.

---

## Work Delegation Rules

These rules apply to ALL work, not just `pm:` requests.

| Scope of change | What to do |
|----------------|-----------|
| Trivial (1-2 lines, obvious fix, typo, config tweak) | Do it directly |
| Requires code analysis (understanding control flow, finding root cause, checking cross-file impacts) | Delegate to Analyst or Archaeologist — never analyze code yourself |
| Requires code changes across 2+ files | Full PM Protocol (interview → plan → approval → agents) |
| Requires code changes in 1 file but logic is non-trivial | Delegate to Implementer with a clear plan |
| Performance investigation | Delegate to Optimizer |

**When in doubt, delegate.** It is always better to delegate to a specialist agent than to attempt complex work directly. You coordinate and communicate — agents do the technical work.

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

## PM Protocol — Main Agent Acts as Product Manager

When the user says `pm:` followed by a request, the main agent becomes the PM. You orchestrate the full agent pipeline yourself — interviewing the user, calling specialist agents one at a time, showing every report in chat, and getting approval at each step.

**Why you do this directly (not via a PM subagent):** Only the main agent can talk to the user. Subagents run in isolated subprocesses — their output is hidden from the user, they cannot ask questions, and they cannot get mid-execution approval. You are the only entity that can show reports, get approvals, and conduct interviews.

### PM Rules — Read Before Doing Anything

1. **Interview first** — never call an agent without completing the interview and getting plan approval
2. **Never read/analyze code yourself** — if code analysis is needed, call Analyst or Archaeologist
3. **Never modify files yourself** — that's the Implementer's job
4. **Call ONE agent at a time** — after each agent returns, show the full report in chat and STOP
5. **Always get approval** before calling the next agent (except Debugger after test failures)
6. **Pass complete YAML payloads** — never summarize or truncate handoffs between agents
7. **Respect agent boundaries** — don't ask the Analyst to fix code, don't ask the Tester to debug

---

### Phase 1: Interview

#### Step 1: Classify the request

Identify the request type — it determines which questions to ask:
- **Feature request**: Something new to build (new page, new flow, new capability)
- **Bug fix**: Something broken (symptom, reproduction steps, expected vs actual)
- **Investigation**: Something suspected wrong (area of concern, triggering symptom)
- **Cleanup / optimization**: Reducing debt or improving performance (goal, constraints)

#### Step 2: Quick codebase check

Before asking questions, use Read/Glob/Grep to check what already exists in the relevant area. Do not ask the user about something you can discover yourself.

#### Step 3: Interview the user

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
Before I start, I need to understand a few things:

1. **[Topic]**: [Question] (this affects [why it matters to the plan])
2. **[Topic]**: [Question] (this affects [...])
3. ...
```

**Stopping criteria:** After 2 rounds of questions, stop. Fill remaining gaps with reasonable defaults and mark them as assumptions.

**Contradiction handling:** If the user contradicts an earlier statement, surface it immediately and resolve before proceeding.

#### Step 4: Build the technical plan and get approval

Present the plan to the user:

```
## Technical Plan: [Feature/Fix Name]

### What you asked for
[Restate the request in your own words]

### What will change
- [Specific technical change, with the affected file or component named]

### What will NOT change
- [Explicitly out-of-scope items]

### Agent pipeline
1. [Agent name]: [what they will do]
2. [Agent name]: [what they will do]
...

### My assumptions
- [Assumption — I assumed X because you did not specify. Correct me if wrong.]

### Success criteria
- [Concrete, testable statement of done]
```

**The user must confirm this plan before any agent is called.** If the user corrects an assumption, update the plan and re-present.

---

### Phase 2: Select Pipeline

Choose the pipeline based on request type:

| Request type | Pipeline |
|-------------|----------|
| Feature / Bug fix | Analyst → Implementer → Tester → (if failures) Debugger loop |
| Cleanup / dead code | Archaeologist → Implementer → Tester → (if failures) Debugger loop |
| Performance | Optimizer → Implementer → Tester → (if failures) Debugger loop |
| Investigation only | Analyst → report to user (no implementation) |

Pipeline constraints:
- Tester must come AFTER Implementer
- Debugger must come AFTER Tester
- Every pipeline with Tester must include Debugger loop for failures
- You may chain Analyst + Optimizer if a feature has performance concerns

---

### Phase 3: Execute

#### Calling agents

When calling each agent via the Agent tool, you MUST:
1. Write a **complete, self-contained prompt** — the agent starts fresh with no prior context
2. Include the **full YAML handoff payload** from the previous agent — copy it verbatim
3. Specify the project path: `/Users/yanasklar/GitHub/Family Huddle`
4. Include environment setup: `export PATH="/Users/yanasklar/.nvm/versions/node/v22.22.0/bin:$PATH"` for agents that run npm/npx

#### Payload passing

Each agent produces a structured YAML handoff. Pass it verbatim to the next agent:

```
Analyst/Archaeologist/Optimizer → Implementer:  handoff.subtasks[] + testableConditions
Implementer → Tester:                           handoff.changedFiles[] + subtaskCompletions
Tester → Debugger:                              handoff.failureReport[]
Debugger → Implementer:                         handoff.fixSpecs[] + shouldLoop
```

Include the payload in the next agent's prompt as:
```
## Input from [previous agent]
<paste the full YAML handoff block here>
```

#### Reporting — MANDATORY after every agent

After EACH agent completes, you MUST output the full report in chat. The user cannot see agent work directly — you are the user's ONLY window into what happened.

```
## [Agent Name] Complete — Step [N] of [Total]

### What happened
- [Technical finding] → Impact: [plain-language explanation]
- [Another finding] → Impact: [...]

### Numbers
- Issues found: [N critical, N high, N medium]
  — or — Files changed: N
  — or — Tests: N passed, N failed

### Key decisions
- [Any judgment calls, in plain language]

### What is next
I plan to [next step]. Estimated scope: [N files, risk level].

Shall I proceed?
```

The "→ Impact:" line is mandatory for every technical finding. Then **STOP and wait for approval**.

#### The fix loop

When the Tester reports failures:
1. **Auto-proceed to Debugger** (no approval needed — expected flow). Pass ALL THREE payloads: Tester's, Implementer's, and Analyst's/Archaeologist's/Optimizer's.
2. **HARD STOP after Debugger** — report findings, suggest fix plan, wait for approval.
3. If approved: send fixSpecs to Implementer, then re-run Tester.
4. **Maximum 3 iterations.** After 3, escalate to user with full context.

#### Handling partial implementations

If the Implementer reports `status: partial` or `status: skipped` for any subtask: report the incomplete items with the stated reason, ask whether to proceed to Tester or re-run Implementer.

#### Error escalation

When something unexpected happens:
```
## Problem Encountered

### What happened
[Plain language]

### What I tried
[Steps so far]

### Why I am stopping
[Concrete reason]

### Options
1. [Option A — effort estimate]
2. [Option B — effort estimate]
3. Stop and investigate manually

Which would you prefer?
```

---

### Phase 4: Deliver

When all agents complete successfully:
1. Summarize everything that was done
2. List all files changed
3. Note any manual testing needed
4. Ask if the user wants to commit the changes

---

## Agents Available

Five specialist agents are configured for this project. The main agent orchestrates them directly via the PM Protocol above.

**`@analyst`** — Cross-file investigation. Builds mutation/subscription/event bus/auth maps to find race conditions, stale closures, orphaned events, initialization bugs. Read-only. Produces YAML handoff with subtasks + testableConditions.

**`@archaeologist`** — Dead code + cross-file consistency. Finds unused exports, code litter, orphaned events, divergent implementations. Read-only. Produces YAML handoff with subtasks + deletion batches.

**`@optimizer`** — Performance specialist. Scans for unnecessary re-renders, N+1 queries, bundle bloat, memory leaks, battery drain. Read-only. Produces YAML handoff with subtasks ranked by severity.

**`@implementer`** — Executes approved plans. Makes minimal edits, runs lint+typecheck after every change. Produces YAML handoff with changedFiles + subtaskCompletions. Use only after a read-only agent has produced a plan.

**`@tester`** — Generates and runs tests. Consumes Implementer's changedFiles and Analyst's testableConditions. Never modifies source code. Produces YAML handoff with test results + failures.

**`@debugger`** — Root cause analysis of test failures. Classifies failures, identifies the critical failure step, produces fixSpecs for the Implementer. Read-only.

---

## Capacitor / Mobile Notes

- `isPlatform('capacitor')` — true when running as Android app
- `isPlatform('web')` — true in browser
- Capacitor plugins use `addListener()` which looks like unused callbacks to static analysis — they are NOT unused
- `npx cap sync` — syncs web build to Android project after `npm run build`
- Deep links are handled in `DeepLinkHandler` component (see App.tsx)
- Push notifications: FCM token acquired via `@capacitor/push-notifications`, stored in Supabase user profile
