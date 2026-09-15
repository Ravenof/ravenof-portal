-- ── Rolės: tester / event_moderator / banned + apsauga nuo savavališko rolių ir valiutų keitimo ──
-- Priežastis: profiles_role_check leido tik 'user' | 'admin', todėl admino forma
-- „tester" tyliai neįsirašydavo. Papildomai: „Users update own profile" RLS leido
-- žaidėjui per REST keisti SAVO role/gold/rubies/essence – uždarom trigeriu
-- (SECURITY DEFINER RPC'ai veikia kaip owner'is, jų trigeris neliečia).

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['user','tester','event_moderator','admin','banned']));

create or replace function public.rvn__profiles_guard()
returns trigger language plpgsql as $$
begin
  -- Tik tiesioginiai kliento (PostgREST, rolė authenticated/anon) atnaujinimai.
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if new.role is distinct from old.role
       or new.gold is distinct from old.gold
       or new.rubies is distinct from old.rubies
       or new.essence is distinct from old.essence
       or new.xp_total is distinct from old.xp_total
       or new.level is distinct from old.level
       or new.rank_key is distinct from old.rank_key
       or new.ranked_win_streak is distinct from old.ranked_win_streak
       or new.welcome_reward_claimed is distinct from old.welcome_reward_claimed
    then
      raise exception 'profiles: protected column change not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.rvn__profiles_guard();

-- Iš kur žaidėjas paskutinį kartą žaidė (web / desktop / android) ir kokia app versija.
alter table public.profiles add column if not exists last_platform text;
alter table public.profiles add column if not exists last_app_version text;

-- Heartbeat papildomas platformos/versijos įrašymu (senas rvn_heartbeat() lieka).
create or replace function public.rvn_heartbeat_v2(p_platform text default null, p_version text default null)
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set last_seen_at = now(),
         last_platform = coalesce(p_platform, last_platform),
         last_app_version = coalesce(p_version, last_app_version)
   where id = auth.uid();
$$;
grant execute on function public.rvn_heartbeat_v2(text, text) to authenticated;
