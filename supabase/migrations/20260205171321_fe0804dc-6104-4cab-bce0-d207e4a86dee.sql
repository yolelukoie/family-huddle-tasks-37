-- Create block_family_member RPC function
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

-- Create unblock_family_member RPC function
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