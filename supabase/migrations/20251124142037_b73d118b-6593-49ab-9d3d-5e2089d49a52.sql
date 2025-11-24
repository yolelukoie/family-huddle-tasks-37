-- Add DELETE RLS policies for user_families table

-- Policy 1: Users can delete their own family memberships (quit family)
CREATE POLICY "Users can delete own family membership"
ON public.user_families
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Family owners can remove other members (kick members)
CREATE POLICY "Family owners can remove members"
ON public.user_families
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id = user_families.family_id
    AND f.created_by = auth.uid()
  )
);