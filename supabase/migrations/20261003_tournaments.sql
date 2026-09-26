-- ════════════════════════════════════════════════════════════════════════════
--  TURNYRAI (draugiškų kovų režimas) — double elimination 4 / 8 / 16
--  • dig_tournaments / dig_tourney_entrants / dig_tourney_matches (+ Realtime)
--  • RPC: create / join / join_code / leave / kick / fill_bots / start /
--         ready / report / tick  (+ vidinės rvn__tourney_*)
--  • economy_config 'tournament_rewards' – atlygiai pagal dydį ir vietą,
--    daugiklis pagal žmonių dalį, dienos riba (3 pilni turnyrai per parą).
--  Modelis v1: kliento šeimininkas (esamas PvP). Serveris = šios RPC:
--  tinklelio judėjimas, ready-check, terminai, botų kovos – vien DB pusėje.
--  Idempotentiška (galima paleisti kelis kartus).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0) Pavadinimai: public.tournament_matches / tournament_players jau naudoja
--    fizinių renginių (admin/events) sistema → skaitmeniniai turnyrai = dig_*.
--    Jei ankstesnis šios migracijos bandymas paliko tuščias SENO pavadinimo lenteles
--    (tournaments / tournament_entrants su MŪSŲ stulpeliais) – išvalom. Renginių
--    lentelių (be šių stulpelių) nelieciam.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tournament_entrants' and column_name = 'bot_slug')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tournament_entrants' and column_name = 'event_id') then
    execute 'drop table public.tournament_entrants';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tournaments' and column_name = 'winner_entrant')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tournaments' and column_name = 'event_id') then
    execute 'drop table public.tournaments cascade';
  end if;
end $$;

-- ── 1) Lentelės ─────────────────────────────────────────────────────────────
create table if not exists public.dig_tournaments (
  id             uuid primary key default gen_random_uuid(),
  code           text unique,
  size           int  not null check (size in (4, 8, 16)),
  format         text not null default 'zmk' check (format in ('zmk', 'classic')),
  is_public      boolean not null default true,
  host_id        uuid not null references auth.users(id) on delete cascade,
  status         text not null default 'lobby' check (status in ('lobby', 'running', 'finished', 'abandoned')),
  winner_entrant uuid,
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  finished_at    timestamptz,
  updated_at     timestamptz not null default now()
);
create index if not exists dig_tournaments_status_idx on public.dig_tournaments (status, is_public, created_at desc);

create table if not exists public.dig_tourney_entrants (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.dig_tournaments(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete cascade,
  bot_slug       text,
  name           text not null,
  avatar         text,
  deck_id        uuid references public.decks(id) on delete set null,
  faction_id     int,
  seed           int,
  status         text not null default 'active' check (status in ('active', 'eliminated', 'left')),
  losses         int  not null default 0,
  final_place    int,
  reward         jsonb,
  reward_granted boolean not null default false,
  joined_at      timestamptz not null default now(),
  constraint tournament_entrant_kind check ((user_id is null) <> (bot_slug is null))
);
create unique index if not exists dig_tourney_entrants_user_uq on public.dig_tourney_entrants (tournament_id, user_id) where user_id is not null;
create index if not exists dig_tourney_entrants_t_idx on public.dig_tourney_entrants (tournament_id);
create index if not exists dig_tourney_entrants_user_idx on public.dig_tourney_entrants (user_id);

create table if not exists public.dig_tourney_matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.dig_tournaments(id) on delete cascade,
  key             text not null,
  bracket         text not null check (bracket in ('W', 'L', 'GF')),
  round           int  not null,
  idx             int  not null,
  entrant_a       uuid references public.dig_tourney_entrants(id) on delete set null,
  entrant_b       uuid references public.dig_tourney_entrants(id) on delete set null,
  win_to_key      text,
  win_to_slot     text,
  lose_to_key     text,
  lose_to_slot    text,
  loser_place     int,
  status          text not null default 'waiting' check (status in ('waiting', 'ready_check', 'live', 'done', 'skipped')),
  ready_a         boolean not null default false,
  ready_b         boolean not null default false,
  ready_deadline  timestamptz,
  pvp_match_id    uuid,
  report_a        uuid,
  report_b        uuid,
  first_report_at timestamptz,
  started_at      timestamptz,
  finished_at     timestamptz,
  winner          uuid,
  reason          text,
  updated_at      timestamptz not null default now(),
  unique (tournament_id, key)
);
create index if not exists dig_tourney_matches_t_idx on public.dig_tourney_matches (tournament_id, status);

alter table public.dig_tournaments         enable row level security;
alter table public.dig_tourney_entrants enable row level security;
alter table public.dig_tourney_matches  enable row level security;
drop policy if exists tourney_read on public.dig_tournaments;
create policy tourney_read on public.dig_tournaments for select to authenticated using (true);
drop policy if exists tourney_entrants_read on public.dig_tourney_entrants;
create policy tourney_entrants_read on public.dig_tourney_entrants for select to authenticated using (true);
drop policy if exists tourney_matches_read on public.dig_tourney_matches;
create policy tourney_matches_read on public.dig_tourney_matches for select to authenticated using (true);
-- Rašymai – TIK per SECURITY DEFINER RPC.

do $$ begin
  begin alter publication supabase_realtime add table public.dig_tournaments; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.dig_tourney_entrants; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.dig_tourney_matches; exception when duplicate_object then null; when undefined_object then null; end;
end $$;

-- ── 2) Atlygių konfigūracija ────────────────────────────────────────────────
insert into public.economy_config (key, value) values ('tournament_rewards', $j${
  "places": {
    "4": {
      "1": [{"type":"currency","currency":"silver","amount":800},{"type":"currency","currency":"essence","amount":40}],
      "2": [{"type":"currency","currency":"silver","amount":400},{"type":"currency","currency":"essence","amount":20}],
      "3": [{"type":"currency","currency":"silver","amount":200}],
      "4": [{"type":"currency","currency":"silver","amount":100}]
    },
    "8": {
      "1": [{"type":"currency","currency":"silver","amount":1500},{"type":"currency","currency":"essence","amount":80},{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}],
      "2": [{"type":"currency","currency":"silver","amount":900},{"type":"currency","currency":"essence","amount":40}],
      "3": [{"type":"currency","currency":"silver","amount":600},{"type":"currency","currency":"essence","amount":20}],
      "4": [{"type":"currency","currency":"silver","amount":400}],
      "5-6": [{"type":"currency","currency":"silver","amount":250}],
      "7-8": [{"type":"currency","currency":"silver","amount":150}]
    },
    "16": {
      "1": [{"type":"currency","currency":"silver","amount":3000},{"type":"currency","currency":"essence","amount":150},{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":2},{"type":"currency","currency":"rubies","amount":5}],
      "2": [{"type":"currency","currency":"silver","amount":1800},{"type":"currency","currency":"essence","amount":80},{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}],
      "3": [{"type":"currency","currency":"silver","amount":1200},{"type":"currency","currency":"essence","amount":50}],
      "4": [{"type":"currency","currency":"silver","amount":800},{"type":"currency","currency":"essence","amount":30}],
      "5-6": [{"type":"currency","currency":"silver","amount":500}],
      "7-8": [{"type":"currency","currency":"silver","amount":350}],
      "9-12": [{"type":"currency","currency":"silver","amount":200}],
      "13-16": [{"type":"currency","currency":"silver","amount":100}]
    }
  },
  "human_share": [{"min":0.75,"mult":1.0},{"min":0.5,"mult":0.75},{"min":0.25,"mult":0.5},{"min":0,"mult":0.25}],
  "min_humans_full": 2,
  "daily_full": 3,
  "after_daily_mult": 0.25,
  "items_min_mult": 0.75,
  "ready_seconds": 60,
  "report_confirm_seconds": 60,
  "match_timeout_minutes": 45
}$j$::jsonb)
on conflict (key) do nothing;

-- ── 3) Pagalbinės ───────────────────────────────────────────────────────────
create or replace function public.rvn__tourney_cfg()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.economy_config where key = 'tournament_rewards'), '{}'::jsonb)
$$;

create or replace function public.rvn__tourney_bucket(p_place int)
returns text language sql immutable as $$
  select case when p_place <= 4 then p_place::text when p_place <= 6 then '5-6' when p_place <= 8 then '7-8'
              when p_place <= 12 then '9-12' else '13-16' end
$$;

create or replace function public.rvn__tourney_player(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_name text; v_av text;
begin
  select coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'Žaidėjas'),
         coalesce((select c.image_url from public.cosmetics c where c.id = p.equipped_avatar), p.avatar_url)
    into v_name, v_av
    from public.profiles p where p.id = p_user;
  return jsonb_build_object('name', coalesce(v_name, 'Žaidėjas'), 'avatar', v_av);
end $$;

create or replace function public.rvn__tourney_code()
returns text language plpgsql volatile as $$
declare v text; i int;
begin
  loop
    v := '';
    for i in 1..5 loop v := v || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from public.dig_tournaments where code = v);
  end loop;
  return v;
end $$;

create or replace function public.rvn__tourney_check_deck(p_user uuid, p_deck uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare v_f int;
begin
  select faction_id into v_f from public.decks where id = p_deck and user_id = p_user;
  if not found then raise exception 'tourney_bad_deck'; end if;
  return v_f;
end $$;

-- Ar vartotojas jau turi aktyvų turnyrą (lobby / running, ne iškritęs)?
create or replace function public.rvn__tourney_active_of(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select t.id from public.dig_tournaments t join public.dig_tourney_entrants e on e.tournament_id = t.id
   where e.user_id = p_user and t.status in ('lobby', 'running') and e.status = 'active'
   order by t.created_at desc limit 1
$$;

-- ── 4) Lobby ────────────────────────────────────────────────────────────────
create or replace function public.rvn_tourney_create(p_size int, p_public boolean, p_format text, p_deck uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_code text; v_f int; v_pl jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_size not in (4, 8, 16) then raise exception 'tourney_bad_size'; end if;
  if public.rvn__tourney_active_of(v_uid) is not null then raise exception 'tourney_already_in'; end if;
  v_f := public.rvn__tourney_check_deck(v_uid, p_deck);
  v_code := public.rvn__tourney_code();
  insert into public.dig_tournaments (code, size, format, is_public, host_id)
    values (v_code, p_size, case when p_format = 'classic' then 'classic' else 'zmk' end, coalesce(p_public, true), v_uid)
    returning id into v_id;
  v_pl := public.rvn__tourney_player(v_uid);
  insert into public.dig_tourney_entrants (tournament_id, user_id, name, avatar, deck_id, faction_id)
    values (v_id, v_uid, v_pl->>'name', v_pl->>'avatar', p_deck, v_f);
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function public.rvn_tourney_join(p_id uuid, p_deck uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.dig_tournaments; v_n int; v_f int; v_pl jsonb; v_act uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_t from public.dig_tournaments where id = p_id for update;
  if not found then raise exception 'tourney_not_found'; end if;
  v_f := public.rvn__tourney_check_deck(v_uid, p_deck);
  -- jau dalyvis: lobby metu galima pakeisti kaladę (po starto – užrakinta)
  if exists (select 1 from public.dig_tourney_entrants where tournament_id = p_id and user_id = v_uid) then
    if v_t.status = 'lobby' then
      update public.dig_tourney_entrants set deck_id = p_deck, faction_id = v_f where tournament_id = p_id and user_id = v_uid;
    end if;
    return jsonb_build_object('id', p_id);
  end if;
  if v_t.status <> 'lobby' then raise exception 'tourney_started'; end if;
  v_act := public.rvn__tourney_active_of(v_uid);
  if v_act is not null and v_act <> p_id then raise exception 'tourney_already_in'; end if;
  select count(*) into v_n from public.dig_tourney_entrants where tournament_id = p_id;
  if v_n >= v_t.size then raise exception 'tourney_full'; end if;
  v_pl := public.rvn__tourney_player(v_uid);
  insert into public.dig_tourney_entrants (tournament_id, user_id, name, avatar, deck_id, faction_id)
    values (p_id, v_uid, v_pl->>'name', v_pl->>'avatar', p_deck, v_f);
  update public.dig_tournaments set updated_at = now() where id = p_id;
  return jsonb_build_object('id', p_id);
end $$;

create or replace function public.rvn_tourney_join_code(p_code text, p_deck uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.dig_tournaments where code = upper(trim(p_code)) and status in ('lobby', 'running');
  if v_id is null then raise exception 'tourney_not_found'; end if;
  return public.rvn_tourney_join(v_id, p_deck);
end $$;

create or replace function public.rvn_tourney_leave(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.dig_tournaments;
begin
  select * into v_t from public.dig_tournaments where id = p_id for update;
  if not found then return; end if;
  if v_t.status = 'lobby' then
    if v_t.host_id = v_uid then
      update public.dig_tournaments set status = 'abandoned', updated_at = now() where id = p_id;
    else
      delete from public.dig_tourney_entrants where tournament_id = p_id and user_id = v_uid;
      update public.dig_tournaments set updated_at = now() where id = p_id;
    end if;
  elsif v_t.status = 'running' then
    update public.dig_tourney_entrants set status = 'left' where tournament_id = p_id and user_id = v_uid and status = 'active';
    perform public.rvn__tourney_tick(p_id);
  end if;
end $$;

create or replace function public.rvn_tourney_kick(p_id uuid, p_entrant uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_t public.dig_tournaments;
begin
  select * into v_t from public.dig_tournaments where id = p_id for update;
  if not found or v_t.host_id <> auth.uid() or v_t.status <> 'lobby' then raise exception 'tourney_not_host'; end if;
  delete from public.dig_tourney_entrants where id = p_entrant and tournament_id = p_id and coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid) <> v_t.host_id;
  update public.dig_tournaments set updated_at = now() where id = p_id;
end $$;

create or replace function public.rvn_tourney_fill_bots(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_t public.dig_tournaments; v_n int; v_need int; b record; v_added int := 0; v_f int;
begin
  select * into v_t from public.dig_tournaments where id = p_id for update;
  if not found or v_t.host_id <> auth.uid() or v_t.status <> 'lobby' then raise exception 'tourney_not_host'; end if;
  select count(*) into v_n from public.dig_tourney_entrants where tournament_id = p_id;
  v_need := v_t.size - v_n;
  if v_need <= 0 then return 0; end if;
  for b in
    select rb.* from public.ranked_bots rb
     where rb.active
       and not exists (select 1 from public.dig_tourney_entrants e where e.tournament_id = p_id and e.bot_slug = rb.slug)
     order by random() limit v_need
  loop
    v_f := null;
    if b.faction_slug is not null then select id into v_f from public.factions where slug = b.faction_slug; end if;
    if v_f is null then select id into v_f from public.factions where slug <> 'universalus' and id <> 14 order by random() limit 1; end if;
    insert into public.dig_tourney_entrants (tournament_id, bot_slug, name, avatar, faction_id)
      values (p_id, b.slug, b.name, b.avatar, v_f);
    v_added := v_added + 1;
  end loop;
  update public.dig_tournaments set updated_at = now() where id = p_id;
  return v_added;
end $$;

-- ── 5) Startas: tinklelio šablonas ateina iš kliento (src/lib/tournament/bracket.ts),
--      RPC patikrina jo formą ir priskiria atsitiktinį seeding'ą.
create or replace function public.rvn_tourney_start(p_id uuid, p_template jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_t public.dig_tournaments; v_n int; m jsonb; v_seeds uuid[];
begin
  select * into v_t from public.dig_tournaments where id = p_id for update;
  if not found or v_t.host_id <> auth.uid() then raise exception 'tourney_not_host'; end if;
  if v_t.status <> 'lobby' then raise exception 'tourney_started'; end if;
  select count(*) into v_n from public.dig_tourney_entrants where tournament_id = p_id;
  if v_n <> v_t.size then raise exception 'tourney_not_full'; end if;
  if jsonb_typeof(p_template) <> 'array' or jsonb_array_length(p_template) <> 2 * v_t.size - 1 then raise exception 'tourney_bad_template'; end if;
  -- atsitiktinis seeding'as
  with s as (select id, row_number() over (order by random()) - 1 as sd from public.dig_tourney_entrants where tournament_id = p_id)
  update public.dig_tourney_entrants e set seed = s.sd from s where e.id = s.id;
  select array_agg(id order by seed) into v_seeds from public.dig_tourney_entrants where tournament_id = p_id;
  delete from public.dig_tourney_matches where tournament_id = p_id;
  for m in select * from jsonb_array_elements(p_template) loop
    insert into public.dig_tourney_matches (tournament_id, key, bracket, round, idx, entrant_a, entrant_b,
        win_to_key, win_to_slot, lose_to_key, lose_to_slot, loser_place)
      values (p_id, m->>'key', m->>'bracket', (m->>'round')::int, (m->>'idx')::int,
        case when m ? 'seedA' and m->>'seedA' is not null then v_seeds[(m->>'seedA')::int + 1] end,
        case when m ? 'seedB' and m->>'seedB' is not null then v_seeds[(m->>'seedB')::int + 1] end,
        m->'winTo'->>'key', m->'winTo'->>'slot', m->'loseTo'->>'key', m->'loseTo'->>'slot',
        nullif(m->>'loserPlace', '')::int);
  end loop;
  if (select count(*) from public.dig_tourney_matches where tournament_id = p_id and bracket = 'W' and round = 1 and (entrant_a is null or entrant_b is null)) > 0 then
    raise exception 'tourney_bad_template';
  end if;
  update public.dig_tournaments set status = 'running', started_at = now(), updated_at = now() where id = p_id;
  perform public.rvn__tourney_tick(p_id);
end $$;

-- ── 6) Rezultatų judėjimas ──────────────────────────────────────────────────
create or replace function public.rvn__tourney_finalize(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_t public.dig_tournaments; v_cfg jsonb; v_humans int; v_share numeric; v_mult numeric; v_mh numeric;
        e record; v_base jsonb; v_pay jsonb; el jsonb; v_today int; v_m numeric; v_amt int;
begin
  select * into v_t from public.dig_tournaments where id = p_id;
  v_cfg := public.rvn__tourney_cfg();
  select count(*) into v_humans from public.dig_tourney_entrants where tournament_id = p_id and user_id is not null;
  v_share := v_humans::numeric / v_t.size;
  select coalesce(max((x->>'mult')::numeric), 0.25) into v_mh
    from jsonb_array_elements(coalesce(v_cfg->'human_share', '[]'::jsonb)) x where v_share >= (x->>'min')::numeric;
  if v_humans < coalesce((v_cfg->>'min_humans_full')::int, 2) then v_mh := least(v_mh, 0.25); end if;
  for e in select * from public.dig_tourney_entrants where tournament_id = p_id and user_id is not null and not reward_granted and final_place is not null loop
    v_base := v_cfg->'places'->(v_t.size::text)->public.rvn__tourney_bucket(e.final_place);
    v_mult := coalesce(v_mh, 1);
    select count(distinct source_id) into v_today from public.reward_transactions
     where user_id = e.user_id and source_type = 'tournament' and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
    if v_today >= coalesce((v_cfg->>'daily_full')::int, 3) then v_mult := v_mult * coalesce((v_cfg->>'after_daily_mult')::numeric, 0.25); end if;
    v_pay := '[]'::jsonb;
    if v_base is not null then
      for el in select * from jsonb_array_elements(v_base) loop
        if el->>'type' = 'currency' then
          v_amt := round(coalesce((el->>'amount')::int, 0) * v_mult);
          if v_amt > 0 then v_pay := v_pay || jsonb_build_array(jsonb_set(el, '{amount}', to_jsonb(v_amt))); end if;
        elsif v_mult >= coalesce((v_cfg->>'items_min_mult')::numeric, 0.75) then
          v_pay := v_pay || jsonb_build_array(el);
        end if;
      end loop;
    end if;
    if jsonb_array_length(v_pay) > 0 then
      perform public.rvn__grant_reward_payload(e.user_id, v_pay, 'tournament', p_id::text);
    end if;
    update public.dig_tourney_entrants set reward = jsonb_build_object('items', v_pay, 'mult', v_mult), reward_granted = true where id = e.id;
  end loop;
end $$;

create or replace function public.rvn__tourney_resolve(p_match uuid, p_winner uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare m public.dig_tourney_matches; v_loser uuid; v_done boolean := false;
begin
  select * into m from public.dig_tourney_matches where id = p_match for update;
  if not found or m.status in ('done', 'skipped') then return; end if;
  if p_winner is distinct from m.entrant_a and p_winner is distinct from m.entrant_b then return; end if;
  v_loser := case when p_winner = m.entrant_a then m.entrant_b else m.entrant_a end;
  update public.dig_tourney_matches set winner = p_winner, status = 'done', reason = p_reason, finished_at = now(), updated_at = now() where id = p_match;
  update public.dig_tourney_entrants set losses = losses + 1 where id = v_loser;
  if m.key = 'GF1' then
    if p_winner = m.entrant_a then
      update public.dig_tourney_entrants set final_place = 1 where id = p_winner;
      update public.dig_tourney_entrants set final_place = 2, status = case when status = 'left' then status else 'eliminated' end where id = v_loser;
      update public.dig_tourney_matches set status = 'skipped', updated_at = now() where tournament_id = m.tournament_id and key = 'GF2';
      v_done := true;
    else
      -- bracket reset: abu turi po 1 pralaimėjimą
      update public.dig_tourney_matches set entrant_a = m.entrant_a, entrant_b = m.entrant_b, updated_at = now()
       where tournament_id = m.tournament_id and key = 'GF2';
    end if;
  elsif m.key = 'GF2' then
    update public.dig_tourney_entrants set final_place = 1 where id = p_winner;
    update public.dig_tourney_entrants set final_place = 2, status = case when status = 'left' then status else 'eliminated' end where id = v_loser;
    v_done := true;
  else
    if m.win_to_key is not null then
      if m.win_to_slot = 'a' then update public.dig_tourney_matches set entrant_a = p_winner, updated_at = now() where tournament_id = m.tournament_id and key = m.win_to_key;
      else update public.dig_tourney_matches set entrant_b = p_winner, updated_at = now() where tournament_id = m.tournament_id and key = m.win_to_key; end if;
    end if;
    if m.lose_to_key is not null then
      if m.lose_to_slot = 'a' then update public.dig_tourney_matches set entrant_a = v_loser, updated_at = now() where tournament_id = m.tournament_id and key = m.lose_to_key;
      else update public.dig_tourney_matches set entrant_b = v_loser, updated_at = now() where tournament_id = m.tournament_id and key = m.lose_to_key; end if;
    else
      update public.dig_tourney_entrants set final_place = m.loser_place, status = case when status = 'left' then status else 'eliminated' end where id = v_loser;
    end if;
  end if;
  if v_done then
    update public.dig_tournaments set status = 'finished', finished_at = now(), winner_entrant = p_winner, updated_at = now() where id = m.tournament_id;
    perform public.rvn__tourney_finalize(m.tournament_id);
  else
    update public.dig_tournaments set updated_at = now() where id = m.tournament_id;
  end if;
end $$;

-- Pradėti kovą (abu pasiruošę): žmogus–žmogus → pvp_matches kambarys (A = šeimininkas).
create or replace function public.rvn__tourney_go_live(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.dig_tourney_matches; a public.dig_tourney_entrants; b public.dig_tourney_entrants; v_t public.dig_tournaments; v_pvp uuid;
begin
  select * into m from public.dig_tourney_matches where id = p_match for update;
  if m.status <> 'ready_check' then return; end if;
  select * into a from public.dig_tourney_entrants where id = m.entrant_a;
  select * into b from public.dig_tourney_entrants where id = m.entrant_b;
  select * into v_t from public.dig_tournaments where id = m.tournament_id;
  if a.user_id is not null and b.user_id is not null and a.deck_id is not null and b.deck_id is not null then
    insert into public.pvp_matches (code, is_public, status, host_id, host_deck_id, host_name, guest_id, guest_deck_id, guest_name, format)
      values (null, false, 'ready', a.user_id, a.deck_id, a.name, b.user_id, b.deck_id, b.name, v_t.format)
      returning id into v_pvp;
  end if;
  update public.dig_tourney_matches set status = 'live', pvp_match_id = v_pvp, started_at = now(), updated_at = now() where id = p_match;
end $$;

-- Terminai, botų kovos, pasitraukusieji. Kviečia bet kuris dalyvis (~kas 4 s) — serializuota per FOR UPDATE.
create or replace function public.rvn__tourney_tick(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_t public.dig_tournaments; v_cfg jsonb; m record; a public.dig_tourney_entrants; b public.dig_tourney_entrants;
        v_changed boolean; v_i int := 0; v_pa numeric; v_ra int; v_rb int; v_w uuid;
begin
  select * into v_t from public.dig_tournaments where id = p_id for update;
  if not found or v_t.status <> 'running' then return; end if;
  v_cfg := public.rvn__tourney_cfg();
  loop
    v_i := v_i + 1; v_changed := false;
    exit when v_i > 64;
    for m in select * from public.dig_tourney_matches where tournament_id = p_id and status in ('waiting', 'ready_check', 'live')
                and entrant_a is not null and entrant_b is not null order by bracket, round, idx loop
      select * into a from public.dig_tourney_entrants where id = m.entrant_a;
      select * into b from public.dig_tourney_entrants where id = m.entrant_b;
      -- pasitraukęs žaidėjas pralaimi techniškai
      if a.status = 'left' or b.status = 'left' then
        perform public.rvn__tourney_resolve(m.id, case when a.status = 'left' and b.status <> 'left' then b.id else a.id end, 'forfeit');
        v_changed := true; continue;
      end if;
      if m.status = 'waiting' then
        if a.bot_slug is not null and b.bot_slug is not null then
          -- botas prieš botą: tikimybė pagal rangą (0.2–0.8)
          select coalesce(rank_step, 0) into v_ra from public.ranked_bots where slug = a.bot_slug;
          select coalesce(rank_step, 0) into v_rb from public.ranked_bots where slug = b.bot_slug;
          v_pa := greatest(0.2, least(0.8, 0.5 + (coalesce(v_ra, 0) - coalesce(v_rb, 0)) / 200.0));
          v_w := case when random() < v_pa then a.id else b.id end;
          perform public.rvn__tourney_resolve(m.id, v_w, 'sim');
        else
          update public.dig_tourney_matches
             set status = 'ready_check', ready_a = (a.bot_slug is not null), ready_b = (b.bot_slug is not null),
                 ready_deadline = now() + make_interval(secs => coalesce((v_cfg->>'ready_seconds')::int, 60)), updated_at = now()
           where id = m.id;
        end if;
        v_changed := true;
      elsif m.status = 'ready_check' then
        if m.ready_a and m.ready_b then
          perform public.rvn__tourney_go_live(m.id); v_changed := true;
        elsif m.ready_deadline is not null and now() > m.ready_deadline then
          -- nepasiruošęs pralaimi; abu – pralaimi aukštesnio seed numerio (žemesnės vietos) žaidėjas
          v_w := case when m.ready_a and not m.ready_b then a.id
                      when m.ready_b and not m.ready_a then b.id
                      when coalesce(a.seed, 0) <= coalesce(b.seed, 0) then a.id else b.id end;
          perform public.rvn__tourney_resolve(m.id, v_w, 'no_show'); v_changed := true;
        end if;
      elsif m.status = 'live' then
        if m.report_a is not null and m.report_b is not null then
          perform public.rvn__tourney_resolve(m.id, m.report_a, case when m.report_a = m.report_b then 'played' else 'disputed' end); v_changed := true;
        elsif m.first_report_at is not null and now() > m.first_report_at + make_interval(secs => coalesce((v_cfg->>'report_confirm_seconds')::int, 60)) then
          perform public.rvn__tourney_resolve(m.id, coalesce(m.report_a, m.report_b), 'played'); v_changed := true;
        elsif now() > m.started_at + make_interval(mins => coalesce((v_cfg->>'match_timeout_minutes')::int, 45)) then
          perform public.rvn__tourney_resolve(m.id, case when random() < 0.5 then a.id else b.id end, 'timeout'); v_changed := true;
        end if;
      end if;
    end loop;
    exit when not v_changed;
    select * into v_t from public.dig_tournaments where id = p_id;
    exit when v_t.status <> 'running';
  end loop;
end $$;

create or replace function public.rvn_tourney_tick(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  perform public.rvn__tourney_tick(p_id);
end $$;

-- ── 7) Žaidėjo veiksmai kovoje ──────────────────────────────────────────────
create or replace function public.rvn_tourney_ready(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); m public.dig_tourney_matches; v_e uuid;
begin
  select * into m from public.dig_tourney_matches where id = p_match;
  if not found or m.status <> 'ready_check' then return; end if;
  -- serializuojam per turnyro eilutę (kaip tick)
  perform 1 from public.dig_tournaments where id = m.tournament_id for update;
  select id into v_e from public.dig_tourney_entrants where tournament_id = m.tournament_id and user_id = v_uid;
  if v_e is null then raise exception 'tourney_not_entrant'; end if;
  if v_e = m.entrant_a then update public.dig_tourney_matches set ready_a = true, updated_at = now() where id = p_match;
  elsif v_e = m.entrant_b then update public.dig_tourney_matches set ready_b = true, updated_at = now() where id = p_match;
  else raise exception 'tourney_not_in_match'; end if;
  select * into m from public.dig_tourney_matches where id = p_match;
  if m.ready_a and m.ready_b then perform public.rvn__tourney_go_live(p_match); end if;
end $$;

-- p_winner = laimėjusio dalyvio (entrant) id. Pralaimėjimo pranešimas priimamas iškart;
-- savo pergalė – kai patvirtina varžovas arba po report_confirm_seconds (tick).
create or replace function public.rvn_tourney_report(p_match uuid, p_winner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); m public.dig_tourney_matches; v_e uuid; v_other uuid; o public.dig_tourney_entrants;
begin
  select * into m from public.dig_tourney_matches where id = p_match;
  if not found or m.status <> 'live' then return; end if;
  perform 1 from public.dig_tournaments where id = m.tournament_id for update;
  select id into v_e from public.dig_tourney_entrants where tournament_id = m.tournament_id and user_id = v_uid;
  if v_e is null or (v_e <> m.entrant_a and v_e <> m.entrant_b) then raise exception 'tourney_not_in_match'; end if;
  if p_winner <> m.entrant_a and p_winner <> m.entrant_b then raise exception 'tourney_bad_winner'; end if;
  v_other := case when v_e = m.entrant_a then m.entrant_b else m.entrant_a end;
  select * into o from public.dig_tourney_entrants where id = v_other;
  -- prieš botą arba pripažintas pralaimėjimas → iškart
  if o.bot_slug is not null or p_winner = v_other then
    perform public.rvn__tourney_resolve(p_match, p_winner, 'played');
    perform public.rvn__tourney_tick(m.tournament_id);
    return;
  end if;
  if v_e = m.entrant_a then update public.dig_tourney_matches set report_a = p_winner, first_report_at = coalesce(first_report_at, now()), updated_at = now() where id = p_match;
  else update public.dig_tourney_matches set report_b = p_winner, first_report_at = coalesce(first_report_at, now()), updated_at = now() where id = p_match; end if;
  perform public.rvn__tourney_tick(m.tournament_id);
end $$;

grant execute on function public.rvn_tourney_create(int, boolean, text, uuid) to authenticated;
grant execute on function public.rvn_tourney_join(uuid, uuid) to authenticated;
grant execute on function public.rvn_tourney_join_code(text, uuid) to authenticated;
grant execute on function public.rvn_tourney_leave(uuid) to authenticated;
grant execute on function public.rvn_tourney_kick(uuid, uuid) to authenticated;
grant execute on function public.rvn_tourney_fill_bots(uuid) to authenticated;
grant execute on function public.rvn_tourney_start(uuid, jsonb) to authenticated;
grant execute on function public.rvn_tourney_tick(uuid) to authenticated;
grant execute on function public.rvn_tourney_ready(uuid) to authenticated;
grant execute on function public.rvn_tourney_report(uuid, uuid) to authenticated;
revoke execute on function public.rvn__tourney_tick(uuid) from public, anon, authenticated;
revoke execute on function public.rvn__tourney_resolve(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.rvn__tourney_finalize(uuid) from public, anon, authenticated;
revoke execute on function public.rvn__tourney_go_live(uuid) from public, anon, authenticated;
