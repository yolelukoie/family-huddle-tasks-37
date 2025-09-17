-- Fix the join_family_by_code RPC function to resolve SQL ambiguity error
CREATE OR REPLACE FUNCTION public.join_family_by_code(p_invite_code text)
RETURNS TABLE(id uuid, name text, invite_code text, created_by uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_family public.families%rowtype;
begin
  -- Explicitly qualify the invite_code column to avoid ambiguity
  select *
  into v_family
  from public.families f
  where f.invite_code = p_invite_code
  limit 1;

  if not found then
    -- Return empty set
    return;
  end if;

  -- Insert membership for the current user; ignore if it already exists
  insert into public.user_families (user_id, family_id)
  values (auth.uid(), v_family.id)
  on conflict (user_id, family_id) do nothing;

  return query
  select v_family.id, v_family.name, v_family.invite_code, v_family.created_by, v_family.created_at;
end;
$$;