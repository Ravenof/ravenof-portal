-- =============================================================
-- FIX: handle_new_user trigger
-- Paste this entire file into Supabase SQL Editor and run it.
-- Fixes: "Database error saving new user" on /register
-- =============================================================

-- 1. Re-create the trigger function with improved username logic
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username  text;
  final_username text;
  counter        int := 0;
begin
  -- Use user-provided username from metadata if valid, otherwise derive from email
  base_username := lower(coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g')
  ));
  -- Strip any remaining invalid chars, truncate to 16 chars
  base_username := left(regexp_replace(base_username, '[^a-z0-9_]', '_', 'g'), 16);
  if length(base_username) < 3 then base_username := 'user'; end if;
  final_username := base_username;
  -- Ensure uniqueness
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := left(base_username, 16) || '_' || counter::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      final_username
    )
  );
  return new;
exception when others then
  raise exception 'handle_new_user failed: % (SQLSTATE: %)', sqlerrm, sqlstate;
end;
$$;

-- 2. Re-apply the trigger (drop + create ensures it's active)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Verification check
select
  (select count(*) from information_schema.tables
   where table_schema = 'public' and table_name = 'profiles') as profiles_table_exists,
  (select count(*) from information_schema.routines
   where routine_schema = 'public' and routine_name = 'handle_new_user') as trigger_fn_exists,
  (select count(*) from information_schema.triggers
   where trigger_name = 'on_auth_user_created') as trigger_exists;
