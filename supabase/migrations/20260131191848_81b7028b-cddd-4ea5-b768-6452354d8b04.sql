-- Update regenerate_invite_code to use 24 hours instead of 7 days
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
  -- Check if user is the family creator
  IF NOT EXISTS (
    SELECT 1 FROM families 
    WHERE id = p_family_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only family creator can regenerate invite code';
  END IF;
  
  -- Generate new code and expiration (24 hours instead of 7 days)
  v_new_code := generate_invite_code();
  v_new_expiry := now() + interval '24 hours';
  
  -- Update family with new code, expiration, and clear used_at
  UPDATE families f
  SET invite_code = v_new_code,
      invite_code_expires_at = v_new_expiry,
      invite_code_used_at = NULL,
      updated_at = now()
  WHERE f.id = p_family_id;
  
  RETURN QUERY SELECT v_new_code, v_new_expiry;
END;
$$;