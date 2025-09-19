-- Fix infinite recursion in user_families RLS policies
-- Drop all existing SELECT policies that might cause recursion
DROP POLICY IF EXISTS "Users can view family co-members" ON public.user_families;
DROP POLICY IF EXISTS "Users can view own family memberships" ON public.user_families;
DROP POLICY IF EXISTS "Members can view family members" ON public.user_families;
DROP POLICY IF EXISTS "UserFamilies: select own rows" ON public.user_families;
DROP POLICY IF EXISTS "Users can view their own family relationships" ON public.user_families;

-- Create a single, safe policy for viewing own family memberships
CREATE POLICY "Users can view own family relationships"
ON public.user_families FOR SELECT
USING (user_id = auth.uid());