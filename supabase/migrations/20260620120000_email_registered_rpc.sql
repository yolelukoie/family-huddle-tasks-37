-- email_registered: returns true if an account exists for the given email.
-- Case-insensitive. SECURITY DEFINER so it can read auth.users from the anon role.
-- Trade-off: enables email enumeration; accepted by product for sign-up-first UX.

create or replace function public.email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(p_email)
  );
$$;

revoke all on function public.email_registered(text) from public;
grant execute on function public.email_registered(text) to anon, authenticated;
