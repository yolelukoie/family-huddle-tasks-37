-- =============================================
-- 1. Update regenerate_invite_code to allow any family member (not just creator)
-- =============================================
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_family_id uuid)
RETURNS TABLE(new_invite_code text, new_expires_at timestamptz) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_code text;
  v_new_expiry timestamptz;
BEGIN
  -- Check if user is a family member (not just creator)
  IF NOT EXISTS (
    SELECT 1 FROM user_families 
    WHERE family_id = p_family_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only family members can regenerate invite code';
  END IF;
  
  v_new_code := generate_invite_code();
  v_new_expiry := now() + interval '24 hours';
  
  UPDATE families f
  SET invite_code = v_new_code,
      invite_code_expires_at = v_new_expiry,
      invite_code_used_at = NULL,
      updated_at = now()
  WHERE f.id = p_family_id;
  
  RETURN QUERY SELECT v_new_code, v_new_expiry;
END;
$$;

-- =============================================
-- 2. Drop old creator-only UPDATE policies for families
-- =============================================
DROP POLICY IF EXISTS "Families: update if creator" ON families;
DROP POLICY IF EXISTS "Family creators can update their families" ON families;

-- =============================================
-- 3. Add new policy: any family member can update family details
-- =============================================
CREATE POLICY "Family members can update family"
ON public.families FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_families uf 
  WHERE uf.family_id = families.id AND uf.user_id = auth.uid()
));

-- =============================================
-- 4. Drop old owner-only DELETE policy for user_families
-- =============================================
DROP POLICY IF EXISTS "Family owners can remove members" ON user_families;

-- =============================================
-- 5. Add new policy: any family member can remove other members
-- =============================================
CREATE POLICY "Family members can remove other members"
ON public.user_families FOR DELETE
USING (
  -- User can delete their own membership
  (user_id = auth.uid())
  OR
  -- Any family member can remove other members
  EXISTS (
    SELECT 1 FROM user_families uf
    WHERE uf.family_id = user_families.family_id AND uf.user_id = auth.uid()
  )
);