-- Drop existing function
DROP FUNCTION IF EXISTS public.get_family_members(uuid);

-- Recreate get_family_members function to include avatar_url
CREATE OR REPLACE FUNCTION public.get_family_members(p_family_id uuid)
RETURNS TABLE (
  user_id uuid,
  family_id uuid,
  joined_at timestamptz,
  total_stars int,
  current_stage int,
  profile_id uuid,
  display_name text,
  date_of_birth date,
  gender text,
  age int,
  profile_complete boolean,
  active_family_id uuid,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Ensure the caller is in this family
  with _auth as (
    select auth.uid() as uid
  )
  select
    uf.user_id,
    uf.family_id,
    uf.joined_at,
    uf.total_stars,
    uf.current_stage,
    p.id as profile_id,
    p.display_name,
    p.date_of_birth,
    p.gender,
    p.age,
    p.profile_complete,
    p.active_family_id,
    p.avatar_url
  from public.user_families uf
  join _auth a on true
  join public.user_families my on my.user_id = a.uid and my.family_id = p_family_id
  join public.profiles p on p.id = uf.user_id
  where uf.family_id = p_family_id
$$;