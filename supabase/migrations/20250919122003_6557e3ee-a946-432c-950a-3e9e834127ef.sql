-- Allow a user to see all members of their families
create policy "Members can view family members"
on public.user_families for select
using (
  family_id in (
    select family_id from public.user_families uf
    where uf.user_id = auth.uid()
  )
);

-- Allow a user to see basic profiles of people who share a family
create policy "Family can read basic profiles"
on public.profiles for select
using (
  exists (
    select 1
    from public.user_families me
    join public.user_families them
      on them.family_id = me.family_id
    where me.user_id = auth.uid()
      and them.user_id = profiles.id
  )
);