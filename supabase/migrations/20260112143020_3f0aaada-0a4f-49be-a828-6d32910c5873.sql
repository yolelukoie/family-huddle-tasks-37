-- 1. Drop existing function first
DROP FUNCTION IF EXISTS public.get_family_members(uuid);

-- 2. Recreate with date_of_birth hidden for non-self users
CREATE FUNCTION public.get_family_members(p_family_id uuid)
RETURNS TABLE (
  active_family_id uuid,
  age integer,
  avatar_url text,
  current_stage integer,
  date_of_birth date,
  display_name text,
  family_id uuid,
  gender text,
  joined_at timestamptz,
  profile_complete boolean,
  profile_id uuid,
  total_stars integer,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.active_family_id,
    p.age,
    p.avatar_url,
    uf.current_stage,
    CASE WHEN p.id = auth.uid() THEN p.date_of_birth ELSE NULL END as date_of_birth,
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

-- 3. Drop existing join_family_by_code to recreate with expiration check
DROP FUNCTION IF EXISTS public.join_family_by_code(text);

-- 4. Recreate join_family_by_code with expiration check
CREATE FUNCTION public.join_family_by_code(p_invite_code text)
RETURNS SETOF families
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family families%ROWTYPE;
BEGIN
  -- Find family with valid, non-expired invite code
  SELECT * INTO v_family
  FROM families
  WHERE invite_code = p_invite_code
    AND (invite_code_expires_at IS NULL OR invite_code_expires_at > now());
  
  IF v_family.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
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
  
  RETURN NEXT v_family;
END;
$$;

-- 5. Create function to regenerate invite code (creator only)
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_family_id uuid)
RETURNS TABLE (new_invite_code text, new_expires_at timestamptz)
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
  
  -- Generate new code and expiration
  v_new_code := generate_invite_code();
  v_new_expiry := now() + interval '7 days';
  
  -- Update family with new code and expiration
  UPDATE families f
  SET invite_code = v_new_code,
      invite_code_expires_at = v_new_expiry,
      updated_at = now()
  WHERE f.id = p_family_id;
  
  RETURN QUERY SELECT v_new_code, v_new_expiry;
END;
$$;