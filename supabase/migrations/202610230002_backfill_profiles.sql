-- Backfill profiles for Supabase Auth users created before the profile trigger existed.
insert into public.profiles (id, email, display_name, created_at)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  coalesce(created_at, now())
from auth.users
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);
