
# Fix: Signup Fails Due to Outdated Database Trigger

## Problem

New users cannot sign up because the `handle_new_user()` database trigger is trying to insert into columns (`date_of_birth`, `age`) that were removed from the `profiles` table.

**Error from auth logs:**
```
ERROR: column "date_of_birth" of relation "profiles" does not exist (SQLSTATE 42703)
```

## Root Cause

The `profiles` table was modified at some point to remove the `date_of_birth` and `age` columns, but the trigger function that auto-creates profiles on signup was never updated to match.

**Current trigger tries to insert:**
- `id`, `display_name`, `date_of_birth`, `gender`, `age`, `profile_complete`

**Current profiles table has:**
- `id`, `display_name`, `gender`, `profile_complete`, `active_family_id`, `created_at`, `updated_at`, `avatar_url`, `preferred_language`

## Solution

Update the `handle_new_user()` trigger function to only insert columns that exist in the current schema.

### Database Migration

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    display_name, 
    gender, 
    profile_complete
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data ->> 'gender', 'other'),
    COALESCE((NEW.raw_user_meta_data ->> 'profile_complete')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
```

## What This Fixes

1. Removes references to non-existent `date_of_birth` column
2. Removes references to non-existent `age` column
3. Keeps the essential profile creation logic intact
4. New users will be able to sign up successfully

## Testing

After applying the fix:
1. New user attempts to sign up with email/password
2. Supabase Auth creates user in `auth.users`
3. Trigger fires and creates matching row in `profiles` table
4. User is logged in and can proceed to onboarding
