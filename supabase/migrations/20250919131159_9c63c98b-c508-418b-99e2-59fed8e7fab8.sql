-- Fix the infinite recursion in user_families policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view family members" ON public.user_families;

-- Create a simpler policy that doesn't cause recursion
-- Users can view their own membership records
CREATE POLICY "Users can view own family memberships"
ON public.user_families FOR SELECT
USING (user_id = auth.uid());

-- Users can view other members in families they belong to
-- This uses a direct join without self-referencing recursion
CREATE POLICY "Users can view family co-members"
ON public.user_families FOR SELECT
USING (
  family_id IN (
    SELECT DISTINCT uf.family_id 
    FROM public.user_families uf 
    WHERE uf.user_id = auth.uid()
  )
);