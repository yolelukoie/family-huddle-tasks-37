
# Block System Implementation - COMPLETED

## Summary

Replaced the "kick/remove member" feature with a comprehensive Block system that:
1. Marks members as "blocked" instead of deleting them immediately
2. Restricts their access to family features while blocked
3. Notifies all parties reliably through realtime UPDATE events
4. Automatically kicks users after 30 days of indefinite blocking

---

## Changes Made

### Database Changes
- Added block columns to `user_families`: `blocked_at`, `blocked_until`, `blocked_indefinite`, `blocked_reason`, `blocked_by`
- Created index `user_families_blocked_idx` for efficient queries
- Set `REPLICA IDENTITY FULL` for realtime UPDATE payloads
- Updated `get_family_members` RPC function to include block fields

### New Files Created
- `src/lib/blockUtils.ts` - Block status utilities (isBlocked, formatBlockTimeRemaining, etc.)
- `src/components/modals/BlockMemberModal.tsx` - UI for blocking members with reason and duration
- `supabase/functions/auto-kick-blocked-members/index.ts` - Edge function for auto-kicking after 30 days

### Updated Files
- `src/lib/types.ts` - Added block fields to UserFamily interface
- `src/hooks/useApp.tsx` - Added blockFamilyMember and unblockFamilyMember actions
- `src/hooks/useKickedFromFamily.tsx` - Expanded to handle UPDATE events for block/unblock
- `src/pages/family/FamilyPage.tsx` - Replaced remove button with block/unblock UI
- `src/i18n/locales/en.json` - Added block-related translations

---

## Remaining Setup (Manual)

### Schedule Daily Auto-Kick Job

Run this SQL in the Supabase SQL Editor to schedule the auto-kick job:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily auto-kick at 3 AM UTC
SELECT cron.schedule(
  'auto-kick-blocked-members',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://zglvtspmrihotbfbjtvw.supabase.co/functions/v1/auto-kick-blocked-members',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbHZ0c3Btcmlob3RiZmJqdHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODY0MzksImV4cCI6MjA3MjY2MjQzOX0.eI9SjUJp8IktKbi-ZoJsMYTGnmpvAG8Wzpec7l0RbO4"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Block Duration Options
- 1 hour
- 12 hours
- 1 day
- 1 week
- Until unblocked (indefinite - triggers auto-kick after 30 days)

## Block Reasons
- Harassment / bullying
- Hate or abusive language
- Sexual content
- Violence or threats
- Spam / scam
- Sharing personal info
- Other
