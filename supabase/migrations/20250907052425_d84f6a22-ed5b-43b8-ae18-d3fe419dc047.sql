
-- 1) Make invite_code generated in DB and unique
alter table public.families
  alter column invite_code set default public.generate_invite_code();

-- Unique constraint/index for invite_code
do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i'
      and c.relname = 'ux_families_invite_code'
      and n.nspname = 'public'
  ) then
    create unique index ux_families_invite_code on public.families (invite_code);
  end if;
end $$;

-- 2) Seed defaults automatically when a family is created
-- Create the trigger only if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'families_seed_defaults'
  ) then
    create trigger families_seed_defaults
    after insert on public.families
    for each row execute function public.on_family_insert_seed();
  end if;
end $$;

-- 3) Prevent duplicate memberships and add helpful indexes
alter table public.user_families
  add constraint user_families_user_family_unique unique (user_id, family_id);

create index if not exists idx_user_families_user_id on public.user_families (user_id);

-- (Unique invite_code already creates an index; no extra index needed there)

-- 4) RPC to join family by invite code (bypasses RLS safely)
create or replace function public.join_family_by_code(p_invite_code text)
returns table (
  id uuid,
  name text,
  invite_code text,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to public
as $$
declare
  v_family public.families%rowtype;
begin
  select *
  into v_family
  from public.families
  where invite_code = p_invite_code
  limit 1;

  if not found then
    -- Return empty set
    return;
  end if;

  -- Insert membership for the current user; ignore if it already exists
  insert into public.user_families (user_id, family_id)
  values (auth.uid(), v_family.id)
  on conflict do nothing;

  return query
  select v_family.id, v_family.name, v_family.invite_code, v_family.created_by, v_family.created_at;
end;
$$;
