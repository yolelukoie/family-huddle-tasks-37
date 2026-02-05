
# Fix: Family Members Not Displaying

## Problem Identified

The "Family Members" list shows empty because the database function `get_family_members` is failing with an error:

```
ERROR: 42703: column p.age does not exist
```

The function references two columns (`age` and `date_of_birth`) that don't exist in the `profiles` table. This causes the RPC call to fail silently, resulting in empty member lists.

## Database Evidence

- **Family `cc5d9074-3e29-4c1d-ab3d-7ec5c846695e`** has 2 members in `user_families`:
  - `50952e8b-8d46-4cc0-9701-a5fc9062be98` (Yana)
  - `62e9c60d-1f5e-4c53-9d30-11237967f105` (Yana TAU)

- **Actual `profiles` columns**: `id`, `display_name`, `gender`, `profile_complete`, `active_family_id`, `created_at`, `updated_at`, `avatar_url`, `preferred_language`

- **Missing columns referenced by function**: `age`, `date_of_birth`

## Solution

Update the `get_family_members` function to remove references to non-existent columns:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT (BROKEN)                             │
├─────────────────────────────────────────────────────────────────┤
│ SELECT                                                          │
│   p.active_family_id,                                           │
│   p.age,               ← DOES NOT EXIST                         │
│   p.avatar_url,                                                 │
│   uf.current_stage,                                             │
│   CASE WHEN p.id = auth.uid()                                   │
│     THEN p.date_of_birth ← DOES NOT EXIST                       │
│     ELSE NULL END as date_of_birth,                             │
│   ...                                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FIXED                                      │
├─────────────────────────────────────────────────────────────────┤
│ SELECT                                                          │
│   p.active_family_id,                                           │
│   p.avatar_url,                                                 │
│   uf.current_stage,                                             │
│   p.display_name,                                               │
│   uf.family_id,                                                 │
│   p.gender,                                                     │
│   uf.joined_at,                                                 │
│   p.profile_complete,                                           │
│   p.id as profile_id,                                           │
│   uf.total_stars,                                               │
│   uf.user_id                                                    │
│   ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Database Migration

Replace the `get_family_members` function with corrected version:

```sql
CREATE OR REPLACE FUNCTION public.get_family_members(p_family_id uuid)
RETURNS TABLE(
  active_family_id uuid,
  avatar_url text,
  current_stage integer,
  display_name text,
  family_id uuid,
  gender text,
  joined_at timestamp with time zone,
  profile_complete boolean,
  profile_id uuid,
  total_stars integer,
  user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.active_family_id,
    p.avatar_url,
    uf.current_stage,
    p.display_name,
    uf.family_id,
    p.gender,
    uf.joined_at,
    p.profile_complete,
    p.id as profile_id,
    uf.total_stars,
    uf.user_id
  FROM user_families uf
  JOIN profiles p ON p.id = uf.user_id
  WHERE uf.family_id = p_family_id
    AND EXISTS (
      SELECT 1 FROM user_families 
      WHERE user_id = auth.uid() 
      AND family_id = p_family_id
    );
$$;
```

### Changes Summary

| Change | Description |
|--------|-------------|
| Remove `p.age` | Column doesn't exist in profiles table |
| Remove `date_of_birth` | Column doesn't exist, and its CASE expression |
| Update return type | Remove `age integer` and `date_of_birth date` from return table |
| Preserve security | Keep SECURITY DEFINER to allow cross-user profile access |

### No Code Changes Required

The frontend code in `useApp.tsx` already handles missing fields gracefully:
- `fetchFamilyMembers` maps data without expecting `age` or `date_of_birth`
- No TypeScript types reference these removed fields

### Impact Assessment

- **Fix**: Family members will appear correctly after migration
- **No breaking changes**: No existing functionality relies on `age` or `date_of_birth` fields
- **No data loss**: Only fixes the function signature, no table changes
