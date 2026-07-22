-- =============================================================================
-- PoolOps Pro — Auth → profiles bootstrap (FIXES BROKEN ACCOUNT CREATION)
-- Run AFTER schema.sql. ADDITIVE + idempotent (create or replace / drop-if-exists).
--
-- ROOT CAUSE (see AUDIT.md): nothing created a public.profiles row when a user
-- signed up, so the follow-on organization_members / staff_profiles inserts hit a
-- foreign-key violation (profile_id → profiles.id → auth.users.id). Account
-- creation half-succeeded (auth.users row) then broke everything downstream.
--
-- This installs the standard Supabase pattern: a trigger that creates the profile
-- row automatically on signup, copying name/role from the invite metadata.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do update
    set email      = excluded.email,
        first_name = coalesce(public.profiles.first_name, excluded.first_name),
        last_name  = coalesce(public.profiles.last_name,  excluded.last_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profile rows for any existing auth users that lack one.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Done. Account creation (and invite acceptance) can now link org membership.
