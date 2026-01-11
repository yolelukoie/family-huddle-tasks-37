-- Fix Issue 1: Consolidate profiles RLS policies
-- Drop redundant SELECT policies, keeping "Read self or co-members" which uses is_in_same_family()
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Family can read basic profiles" ON public.profiles;

-- Fix Issue 2: Add DELETE policy for chat_messages
-- Allow users to delete their own messages
CREATE POLICY "Chat: delete own messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix Issue 3: Replace device_tokens ALL policy with granular policies that validate family_id
DROP POLICY IF EXISTS "users manage their tokens" ON public.device_tokens;

CREATE POLICY "device_tokens_select_own"
ON public.device_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_insert_own"
ON public.device_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    family_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.user_families uf
      WHERE uf.user_id = auth.uid()
      AND uf.family_id = device_tokens.family_id
    )
  )
);

CREATE POLICY "device_tokens_update_own"
ON public.device_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    family_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.user_families uf
      WHERE uf.user_id = auth.uid()
      AND uf.family_id = device_tokens.family_id
    )
  )
);

CREATE POLICY "device_tokens_delete_own"
ON public.device_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);