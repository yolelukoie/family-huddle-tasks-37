-- Add column to track when invite code was used
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS invite_code_used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update join_family_by_code to mark code as used and auto-regenerate
CREATE OR REPLACE FUNCTION public.join_family_by_code(p_invite_code text)
 RETURNS SETOF families
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_family families%ROWTYPE;
  v_new_code text;
BEGIN
  -- Find family with valid, non-expired, and unused invite code
  SELECT * INTO v_family
  FROM families
  WHERE invite_code = p_invite_code
    AND (invite_code_expires_at IS NULL OR invite_code_expires_at > now())
    AND invite_code_used_at IS NULL;
  
  IF v_family.id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or already used invite code';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM user_families 
    WHERE user_id = auth.uid() AND family_id = v_family.id
  ) THEN
    RAISE EXCEPTION 'Already a member of this family';
  END IF;
  
  -- Add user to family
  INSERT INTO user_families (user_id, family_id)
  VALUES (auth.uid(), v_family.id);
  
  -- Mark the current invite code as used
  UPDATE families
  SET invite_code_used_at = now()
  WHERE id = v_family.id;
  
  -- Generate a new invite code for future use
  v_new_code := generate_invite_code();
  
  UPDATE families
  SET invite_code = v_new_code,
      invite_code_expires_at = now() + interval '7 days',
      invite_code_used_at = NULL,
      updated_at = now()
  WHERE id = v_family.id;
  
  RETURN NEXT v_family;
END;
$function$;

-- Update regenerate_invite_code to also clear the used_at flag
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_family_id uuid)
 RETURNS TABLE(new_invite_code text, new_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Generate new code and expiration
  v_new_code := generate_invite_code();
  v_new_expiry := now() + interval '7 days';
  
  -- Update family with new code, expiration, and clear used_at
  UPDATE families f
  SET invite_code = v_new_code,
      invite_code_expires_at = v_new_expiry,
      invite_code_used_at = NULL,
      updated_at = now()
  WHERE f.id = p_family_id;
  
  RETURN QUERY SELECT v_new_code, v_new_expiry;
END;
$function$;