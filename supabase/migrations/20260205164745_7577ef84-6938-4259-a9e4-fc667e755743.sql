-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_family_members(uuid);

-- Then recreate it with block fields
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
   user_id uuid,
   blocked_at timestamp with time zone,
   blocked_until timestamp with time zone,
   blocked_indefinite boolean,
   blocked_reason text,
   blocked_by uuid
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    uf.user_id,
    uf.blocked_at,
    uf.blocked_until,
    uf.blocked_indefinite,
    uf.blocked_reason,
    uf.blocked_by
  FROM user_families uf
  JOIN profiles p ON p.id = uf.user_id
  WHERE uf.family_id = p_family_id
    AND EXISTS (
      SELECT 1 FROM user_families 
      WHERE user_id = auth.uid() 
      AND family_id = p_family_id
    );
$function$;