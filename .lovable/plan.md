
## What’s broken (confirmed)
Account deletion is failing **before the Edge Function is even reached**.

Evidence from your browser logs + network snapshot:
- The request to `POST https://zglvtspmrihotbfbjtvw.supabase.co/functions/v1/delete-account` fails with **`TypeError: Failed to fetch`**
- Supabase client surfaces this as **`FunctionsFetchError: Failed to send a request to the Edge Function`**
- Edge Function logs show only “booted” and **no invocation logs**, strongly indicating the browser blocked the call (CORS preflight / gateway rejection).

This is consistent with a **CORS preflight mismatch** and/or **JWT verification blocking OPTIONS**:
- The browser includes headers like `x-supabase-client-platform`
- `delete-account` (and other functions) currently only allow:
  `authorization, x-client-info, apikey, content-type`
- `delete-account` is not configured with `verify_jwt=false`, so the Supabase gateway may reject OPTIONS without Authorization before your function’s own CORS handler runs.

Result: the browser blocks the request → you see “Failed to delete account”.

---

## Goal
1) Fix account deletion so it always reaches the edge function and completes.
2) Keep your “no ownership” model intact:
   - All members can rename family + invite
   - Family persists until last member deletes account
3) Ensure “family name changed” notifications continue working reliably (also depends on Edge Function calls from browser).

---

## Implementation plan (what I will change)

### A) Fix CORS for browser calls (critical)
Update CORS handling to allow the full set of Supabase client headers.

**Update these Edge Functions:**
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/send-push/index.ts` (needed for family name change notifications)
- `supabase/functions/upload-character-images/index.ts` (also currently missing headers; prevents future “Failed to fetch” bugs)

**New recommended CORS headers (use everywhere):**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS` (and GET if needed)
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`

**Also adjust OPTIONS responses**
- Return `204` with `null` body (best practice), not `"ok"` (some clients are picky).

Why this fixes it:
- The browser’s preflight will succeed because it sees all requested headers are allowed.

---

### B) Ensure OPTIONS requests aren’t blocked by Supabase gateway (critical)
Update `supabase/config.toml` to disable gateway JWT verification for functions that must handle preflight cleanly:

Add:
- `[functions.delete-account] verify_jwt = false`
- `[functions.upload-character-images] verify_jwt = false` (optional but recommended)
(`send-push` is already set to `verify_jwt = false`)

Important: This does not reduce security because:
- `delete-account` already validates the user token inside the function (`auth.getUser()`).
- `upload-character-images` already validates auth in code.
- `send-push` uses its own authorization logic (shared secret optional) and/or service role.

---

### C) Add “diagnostic” logs for quicker verification (short-term)
In `delete-account`, log:
- `req.method`
- `Origin` header
- `Access-Control-Request-Headers` header (for OPTIONS)

This makes it immediately obvious in Edge logs if the browser is still failing preflight.

---

## Testing plan (I will test before reporting back)

### 1) Confirm the request reaches the Edge Function
In Preview:
1. Go to `/personal`
2. Open Delete Account modal
3. Type `DELETE`, click Delete

Pass criteria:
- Network tab shows the function request returning `200` or a clear JSON error (not “Failed to fetch”).
- Supabase Edge logs show your function logs (not just “booted”).

### 2) Confirm the full deletion logic works (no-ownership behavior)
Use a test setup (recommended: create throwaway test accounts):

Scenario A — Not last member:
1. Create Family with User A
2. User B joins same family
3. User A deletes account
Expected:
- Account deletion succeeds
- Family remains for User B
- User B can continue using the family

Scenario B — Last member:
1. User C creates Family alone (only member)
2. User C deletes account
Expected:
- Account deletion succeeds
- Family and family data are deleted (per your current function logic)

### 3) Confirm family rename notifications still work
1. Have 2 users in the same family
2. User A changes family name
Expected:
- User B receives push notification: `Family "{old}" changed its name to "{new}"`
- No “Failed to fetch” errors calling `send-push`

---

## Files I will touch
- `supabase/functions/delete-account/index.ts` (CORS headers + OPTIONS handling + logs)
- `supabase/functions/send-push/index.ts` (CORS headers/allow list)
- `supabase/functions/upload-character-images/index.ts` (CORS headers/allow list)
- `supabase/config.toml` (add verify_jwt=false for delete-account (+ optional upload-character-images))

---

## Likely outcome
Once CORS + verify_jwt are corrected:
- The “Failed to fetch” error should disappear
- Delete Account should start working immediately
- Push notifications triggered via `send-push` from the client will also become reliable

---

## Contingency (if deletion reaches function but fails inside)
If, after CORS fix, deletion still fails:
- We’ll now see real error logs from `delete-account` (DB constraint, missing table, etc.)
- Then we’ll fix the specific deletion step/order based on the logs
