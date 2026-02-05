-- Drop the existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.get_family_members(uuid);

-- Recreate with corrected return type (no age, no date_of_birth)
CREATE OR REPLACE FUNCTION public.get_family_members(p_family_id uuid)
RETURNS TABLE(
  active_family_id uuid,
  avatar_url text,
  current_stage integer,
  display_name text,
  family_id uuid,
  gender text,
  joined_at timestamp with time zone,
  profile_complete boolean,
  profile_id uuid,
  total_stars integer,
  user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.active_family_id,
    p.avatar_url,
    uf.current_stage,
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