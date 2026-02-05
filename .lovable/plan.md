
# Fix: Block System RLS Policy and Implementation

## Root Cause

The blocking feature fails silently because **RLS policies prevent cross-user updates**. When User A tries to block User B, they attempt to UPDATE User B's `user_families` row, but the existing policies only allow users to update their own rows:

```sql
-- Current policy
UPDATE USING (auth.uid() = user_id)  -- Only allows updating own row
```

This causes the Supabase UPDATE to affect 0 rows (no error returned), so the code thinks it succeeded while the database remains unchanged.

## Solution

Create a `SECURITY DEFINER` RPC function that bypasses RLS and performs validated blocking operations server-side. This is safer than relaxing RLS policies because:

- It validates the blocker is a family co-member
- It prevents users from blocking themselves
- It keeps RLS strict for direct table access

## Implementation Steps

### 1. Database Migration: Create `block_family_member` RPC Function

Create a new RPC function with `SECURITY DEFINER` that:
- Validates the caller is a member of the same family
- Validates caller is not trying to block themselves
- Updates the target user's `user_families` row with block fields
- Returns success/failure

```sql
CREATE OR REPLACE FUNCTION block_family_member(
  p_family_id UUID,
  p_member_user_id UUID,
  p_reason TEXT,
  p_blocked_until TIMESTAMPTZ,
  p_blocked_indefinite BOOLEAN
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is not blocking themselves
  IF p_member_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  -- Check caller is a member of the family
  IF NOT EXISTS (
    SELECT 1 FROM user_families 
    WHERE family_id = p_family_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this family';
  END IF;
  
  -- Check target is a member of the family
  IF NOT EXISTS (
    SELECT 1 FROM user_families 
    WHERE family_id = p_family_id AND user_id = p_member_user_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this family';
  END IF;
  
  -- Perform the block
  UPDATE user_families
  SET 
    blocked_at = now(),
    blocked_until = p_blocked_until,
    blocked_indefinite = p_blocked_indefinite,
    blocked_reason = p_reason,
    blocked_by = auth.uid()
  WHERE family_id = p_family_id 
    AND user_id = p_member_user_id;
  
  RETURN true;
END;
$$;
```

### 2. Database Migration: Create `unblock_family_member` RPC Function

Similar function for unblocking:

```sql
CREATE OR REPLACE FUNCTION unblock_family_member(
  p_family_id UUID,
  p_member_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is a member of the family
  IF NOT EXISTS (
    SELECT 1 FROM user_families 
    WHERE family_id = p_family_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this family';
  END IF;
  
  -- Perform the unblock
  UPDATE user_families
  SET 
    blocked_at = NULL,
    blocked_until = NULL,
    blocked_indefinite = false,
    blocked_reason = NULL,
    blocked_by = NULL
  WHERE family_id = p_family_id 
    AND user_id = p_member_user_id;
  
  RETURN true;
END;
$$;
```

### 3. Update `src/hooks/useApp.tsx`

Modify `blockFamilyMember` function to use the RPC instead of direct UPDATE:

**Current (broken):**
```typescript
const { error } = await supabase
  .from('user_families')
  .update({ blocked_at: ... })
  .eq('user_id', memberUserId)
  .eq('family_id', familyId);
```

**Fixed:**
```typescript
const { error } = await supabase.rpc('block_family_member', {
  p_family_id: familyId,
  p_member_user_id: memberUserId,
  p_reason: reason,
  p_blocked_until: blockedUntil,
  p_blocked_indefinite: blockedIndefinite,
});
```

### 4. Update `unblockFamilyMember` Similarly

Change from direct UPDATE to RPC call:

```typescript
const { error } = await supabase.rpc('unblock_family_member', {
  p_family_id: familyId,
  p_member_user_id: memberUserId,
});
```

### 5. Add Error Handling for RPC Calls

Currently the code doesn't properly detect when 0 rows are affected. With RPC, we get proper exceptions for validation failures.

## Technical Details

- **Why SECURITY DEFINER?**: This allows the function to run with elevated privileges (bypassing RLS) while still validating the caller's permissions within the function logic
- **Why not just relax RLS?**: Relaxing UPDATE policies could allow unintended modifications to other columns like `total_stars`. The RPC approach is more secure and explicit.

## Files to Modify

1. **New SQL migration** - Create both RPC functions
2. **`src/hooks/useApp.tsx`** - Replace direct UPDATE with RPC calls in `blockFamilyMember` and `unblockFamilyMember`

## Expected Outcome

After implementation:
1. Blocking a member will actually persist to the database
2. The UI will show the "BLOCKED" badge next to blocked members
3. Realtime updates will trigger and notify the blocked user
4. The blocked user will see access restrictions
