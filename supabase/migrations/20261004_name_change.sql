-- ════════════════════════════════════════════════════════════════════════════
-- Žaidėjo vardo keitimas (commit742)
--   • vardą galima keisti kartą per 30 dienų (tikrina serveris, ne klientas)
--   • po keitimo ankstesnis vardas rodomas 60 dienų („Anksčiau: …")
--   • keičiama TIK per rvn_change_name(): tiesioginis profiles.username /
--     display_name / previous_* atnaujinimas iš kliento draudžiamas (guard'as)
-- Idempotentiška (galima paleisti kelis kartus).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Stulpeliai (dalis galėjo būti sukurta profile_username_history_v1.sql) ─
alter table public.profiles add column if not exists username_changed_at timestamptz;
alter table public.profiles add column if not exists previous_username text;
alter table public.profiles add column if not exists previous_username_visible_until timestamptz;
alter table public.profiles add column if not exists previous_display_name text;

create table if not exists public.profile_username_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  old_username  text not null,
  new_username  text not null,
  changed_at    timestamptz not null default now(),
  visible_until timestamptz not null default (now() + interval '60 days')
);
alter table public.profile_username_history add column if not exists old_display_name text;
alter table public.profile_username_history add column if not exists new_display_name text;
create index if not exists idx_username_history_user_id on public.profile_username_history (user_id);
alter table public.profile_username_history enable row level security;
drop policy if exists "username_history_own_read" on public.profile_username_history;
create policy "username_history_own_read" on public.profile_username_history for select using (auth.uid() = user_id);
-- Įrašai – tik per RPC (security definer); klientas nebeįterpia pats
drop policy if exists "username_history_own_insert" on public.profile_username_history;

-- ── 2) Guard: vardo stulpeliai apsaugoti (papildo 20260915_roles_tester_guard) ─
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
       -- vardas keičiamas tik per rvn_change_name()
       or new.username is distinct from old.username
       or new.display_name is distinct from old.display_name
       or new.username_changed_at is distinct from old.username_changed_at
       or new.previous_username is distinct from old.previous_username
       or new.previous_username_visible_until is distinct from old.previous_username_visible_until
       or new.previous_display_name is distinct from old.previous_display_name
    then
      raise exception 'profiles: protected column change not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.rvn__profiles_guard();

-- ── 3) Informacija UI: dabartinis + ankstesnis vardas (60 d.) + kada galima keisti ─
create or replace function public.rvn_name_info(p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(p_user, auth.uid()); p public.profiles; v_prev text;
begin
  if v_uid is null then return null; end if;
  select * into p from public.profiles where id = v_uid;
  if not found then return null; end if;
  if p.previous_username_visible_until is not null and p.previous_username_visible_until > now() then
    v_prev := coalesce(nullif(p.previous_display_name, ''), p.previous_username);
  end if;
  return jsonb_build_object(
    'name', coalesce(nullif(p.display_name, ''), p.username),
    'username', p.username,
    'previousName', v_prev,
    'previousUntil', case when v_prev is not null then p.previous_username_visible_until end,
    -- tik savo profiliui: kada vėl galima keisti
    'changedAt', case when v_uid = auth.uid() then p.username_changed_at end,
    'nextChangeAt', case when v_uid = auth.uid() and p.username_changed_at is not null
                         and p.username_changed_at + interval '30 days' > now()
                         then p.username_changed_at + interval '30 days' end
  );
end $$;

-- ── 4) Vardo keitimas ────────────────────────────────────────────────────────
-- Klaidų kodai (UI verčia): name_auth, name_format, name_reserved, name_same,
-- name_taken, name_cooldown:<iso data>
create or replace function public.rvn_change_name(p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); p public.profiles; v_typed text := btrim(coalesce(p_name, ''));
  v_norm text; v_now timestamptz := now(); v_next timestamptz; v_case_only boolean;
begin
  if v_uid is null then raise exception 'name_auth'; end if;
  if v_typed !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'name_format'; end if;
  v_norm := lower(v_typed);
  if v_norm = any (array['admin','administrator','moderator','mod','ravenof','kaukas','system','support','help',
                         'api','login','register','me','users','events','cards','deck','decks','settings','profile',
                         'community','leaderboards','offline','bot','null','undefined']) then
    raise exception 'name_reserved';
  end if;

  select * into p from public.profiles where id = v_uid for update;
  if not found then raise exception 'name_auth'; end if;
  if v_typed = coalesce(nullif(p.display_name, ''), p.username) then raise exception 'name_same'; end if;

  if p.username_changed_at is not null and p.username_changed_at + interval '30 days' > v_now and not public.is_admin() then
    raise exception 'name_cooldown:%', to_char((p.username_changed_at + interval '30 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  v_case_only := (v_norm = p.username);
  -- užimtas: kito žaidėjo dabartinis vardas ARBA kito žaidėjo ankstesnis vardas, kol jis dar rodomas (60 d.)
  if not v_case_only and exists (
      select 1 from public.profiles
       where id <> v_uid
         and (lower(username) = v_norm
              or (lower(previous_username) = v_norm and previous_username_visible_until > v_now))) then
    raise exception 'name_taken';
  end if;

  update public.profiles set
    username = v_norm,
    display_name = v_typed,
    username_changed_at = v_now,
    -- vien raidžių dydžio pakeitimas – ankstesnio vardo nerodom (tas pats vardas)
    previous_username = case when v_case_only then previous_username else p.username end,
    previous_display_name = case when v_case_only then previous_display_name else coalesce(nullif(p.display_name, ''), p.username) end,
    previous_username_visible_until = case when v_case_only then previous_username_visible_until else v_now + interval '60 days' end,
    updated_at = v_now
  where id = v_uid;

  insert into public.profile_username_history (user_id, old_username, new_username, changed_at, visible_until, old_display_name, new_display_name)
    values (v_uid, coalesce(p.username, ''), v_norm, v_now, v_now + interval '60 days', p.display_name, v_typed);

  v_next := v_now + interval '30 days';
  return jsonb_build_object('name', v_typed, 'username', v_norm, 'nextChangeAt', v_next);
exception when unique_violation then
  raise exception 'name_taken';
end $$;

revoke execute on function public.rvn_change_name(text) from public, anon;
grant execute on function public.rvn_change_name(text) to authenticated;
grant execute on function public.rvn_name_info(uuid) to authenticated;

-- ── 5) Ankstesni vardai sąrašams (draugai ir pan.): id → ankstesnis vardas, kol rodomas ─
create or replace function public.rvn_prev_names(p_ids uuid[])
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(id::text, coalesce(nullif(previous_display_name, ''), previous_username)), '{}'::jsonb)
    from public.profiles
   where id = any (coalesce(p_ids, '{}'::uuid[]))
     and previous_username is not null
     and previous_username_visible_until > now()
     and cardinality(p_ids) <= 500;
$$;
grant execute on function public.rvn_prev_names(uuid[]) to authenticated;
