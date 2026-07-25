-- ════════════════════════════════════════════════════════════════════════════
--  TESTŲ STENDAS — produkcijos formos minimalus schema snapshot
--  ─────────────────────────────────────────────────────────────────────────
--  Šitas failas NĖRA migracija ir NIEKADA neleidžiamas prieš produkciją.
--  Jis atkuria TIK tas lenteles/funkcijas, nuo kurių priklauso progression v2
--  migracijos, ir užpildo jas TIKROMIS produkcijos reikšmėmis:
--    • factions id 6..14 (schema.sql id 1..5 yra seni EN placeholder'iai)
--    • rarities  id 6..10 (sort_order 1..5, copy_limit 2/2/2/1/1)
--  Naudojimas: node supabase/tests/run.mjs
-- ════════════════════════════════════════════════════════════════════════════

-- Supabase rolės (grant ... to authenticated migracijose)
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
drop schema if exists auth cascade;
create schema auth;

create extension if not exists pgcrypto;

-- ── auth.uid() stubas (Supabase JWT vietoje — sesijos GUC) ──────────────────
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

-- ── Bazinis katalogas ───────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key,
  username text unique,
  display_name text,
  role text not null default 'user',
  gold int not null default 0,          -- = SIDABRAS
  rubies int not null default 0,
  essence int not null default 0,
  xp_total bigint not null default 0,
  ranked_win_streak int not null default 0,
  equipped_card_back text,
  equipped_board text,
  equipped_avatar text,
  active_deck_id uuid,
  digital_onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.factions (
  id serial primary key,
  name text unique not null,
  slug text unique not null,
  color_hex text not null default '#9ca3af',
  icon_url text,
  description text,
  sort_order int not null default 0
);

create table public.rarities (
  id serial primary key,
  name text unique not null,
  copy_limit int not null default 2,
  sort_order int not null default 0,
  color_hex text not null default '#9ca3af'
);

create table public.card_types (
  id serial primary key,
  name text unique not null,
  sort_order int not null default 0
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  card_number text,
  name text not null,
  faction_id int references public.factions(id),
  card_type_id int references public.card_types(id),
  rarity_id int references public.rarities(id),
  gold_cost int,
  attack int,
  health int,
  description text,
  effect_text text,
  image_url text,
  is_champion boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.card_translations (
  card_id uuid not null references public.cards(id) on delete cascade,
  locale text not null check (locale in ('lt','en')),
  name text, description text, effect_text text, flavor_text text,
  status text not null default 'approved',
  updated_at timestamptz not null default now(),
  primary key (card_id, locale)
);

create table public.user_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  quantity int not null default 1 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  faction_id int references public.factions(id),
  visibility text not null default 'private',
  score int not null default 0,
  updated_at timestamptz not null default now()
);
create table public.deck_cards (
  deck_id uuid not null references public.decks(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  quantity int not null default 1,
  primary key (deck_id, card_id)
);

-- ── Ekonomikos pamatas (20260810 + vėlesni) ─────────────────────────────────
create table public.economy_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.reward_transactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id text,
  reward_type text not null,
  currency_type text,
  amount int,
  item_type text,
  item_id text,
  quantity int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_inventory (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  quantity int not null default 1,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table public.xp_transactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  reason text,
  source_type text,
  created_at timestamptz not null default now()
);

create table public.matches (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_match_id uuid,
  opponent_id uuid,
  opponent_type text,
  mode text not null,
  result text not null,
  duration_seconds int,
  turns_played int,
  player_actions_count int,
  opponent_actions_count int,
  valid_for_rewards boolean not null default false,
  account_xp_reward int not null default 0,
  season_xp_reward int not null default 0,
  silver_reward int not null default 0,
  rubies_reward int not null default 0,
  essence_reward int not null default 0,
  ranked_progress_delta int not null default 0,
  created_at timestamptz not null default now()
);
create unique index matches_client_uniq on public.matches(user_id, client_match_id) where client_match_id is not null;

-- ── Pakuotės ────────────────────────────────────────────────────────────────
create table public.card_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  cards_per_pack int not null default 10,
  daily_limit int not null default 1,
  price_gold int not null default 250,
  is_active boolean not null default true,
  sort_order int not null default 0
);
create table public.pack_factions (
  pack_id uuid not null references public.card_packs(id) on delete cascade,
  faction_id int not null references public.factions(id) on delete cascade,
  primary key (pack_id, faction_id)
);
create table public.user_pack_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_id uuid not null references public.card_packs(id) on delete cascade,
  quantity int not null default 0,
  primary key (user_id, pack_id)
);

-- ── Kosmetika ───────────────────────────────────────────────────────────────
create table public.cosmetics (
  id text primary key,
  kind text not null,                  -- card_back | board | avatar
  name text not null,
  description text,
  price_gold int not null default 500,
  css text, emoji text, image_url text,
  rarity text, status text not null default 'active',
  owned_by_default boolean not null default false,
  is_shop_exclusive boolean not null default false,
  videos jsonb not null default '[]'::jsonb,
  portrait_fit jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true
);
create table public.user_cosmetics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.cosmetics(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

-- ── Sezonas (20260814 forma) ────────────────────────────────────────────────
create table public.season_pass_seasons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  grace_end_date timestamptz,
  pass_price_silver int not null default 8000,
  pass_price_rubies int not null default 950,
  is_active boolean not null default true
);
create table public.user_season_pass (
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id uuid not null references public.season_pass_seasons(id) on delete cascade,
  xp int not null default 0,
  has_season_pass boolean not null default false,
  season_pass_activated_at timestamptz,
  primary key (user_id, season_id)
);
create table public.user_season_reward_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id uuid not null references public.season_pass_seasons(id) on delete cascade,
  level int not null,
  track text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, season_id, level, track)
);

-- ── Senasis login kalendorius (v1 — backfill šaltinis) ──────────────────────
create table public.monthly_login_rewards (
  day_number int primary key,
  reward_payload jsonb not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.user_monthly_login (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_key text not null,
  day_number int not null,
  date_key text not null,
  claimed_at timestamptz not null default now(),
  unique (user_id, date_key),
  unique (user_id, month_key, day_number)
);

-- ── Senosios dienos užduotys (v1 — koegzistuoja) ────────────────────────────
create table public.daily_task_templates (
  id bigserial primary key,
  difficulty text not null,
  title text not null,
  description text not null,
  objective_type text not null,
  target_value int not null default 1,
  mode_restriction text,
  faction_restriction int,
  reward_payload jsonb not null default '[]'::jsonb,
  weight int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_daily_tasks (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id bigint not null references public.daily_task_templates(id),
  date_key text not null,
  difficulty text not null,
  objective_type text not null,
  title text not null,
  description text not null,
  progress int not null default 0,
  target_value int not null default 1,
  reward_payload jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  is_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  unique (user_id, date_key, difficulty)
);
create table public.user_daily_completion (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date_key text not null,
  is_claimed boolean not null default false,
  claimed_at timestamptz,
  primary key (user_id, date_key)
);
create table public.user_daily_rerolls (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date_key text not null,
  free_reroll_used boolean not null default false,
  paid_reroll_count int not null default 0,
  primary key (user_id, date_key)
);

-- ── Esamos funkcijos, nuo kurių priklauso v2 ────────────────────────────────
create or replace function public.rvn__current_season()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_today date := (now())::date; v_q int; v_start date; v_end timestamptz; v_sid uuid; v_name text; v_theme text;
begin
  select id into v_sid from public.season_pass_seasons
    where starts_at <= now() and (ends_at is null or ends_at >= now()) order by starts_at desc limit 1;
  if v_sid is not null then return v_sid; end if;
  v_q := ((extract(month from v_today)::int - 1) / 3);
  v_start := make_date(extract(year from v_today)::int, v_q*3 + 1, 1);
  v_end := (v_start + interval '3 months' - interval '1 second');
  v_theme := (array['Žiemos','Pavasario','Vasaros','Rudens'])[v_q + 1];
  v_name := v_theme || ' sezonas ' || extract(year from v_today)::int;
  insert into public.season_pass_seasons(title, theme, starts_at, ends_at, grace_end_date, is_active)
    values (v_name, v_theme, v_start, v_end, v_end + interval '7 days', true) returning id into v_sid;
  update public.season_pass_seasons set is_active = false where id <> v_sid;
  return v_sid;
end $$;

create or replace function public.rvn__add_pass_xp(p_user uuid, p_xp int)
returns void language plpgsql security definer set search_path = public as $$
declare v_sid uuid;
begin
  if coalesce(p_xp,0) <= 0 then return; end if;
  v_sid := public.rvn__current_season();
  if v_sid is null then return; end if;
  insert into public.user_season_pass(user_id, season_id, xp) values (p_user, v_sid, p_xp)
    on conflict (user_id, season_id) do update set xp = public.user_season_pass.xp + p_xp;
end $$;

-- rvn__grant_reward_payload — NAUJAUSIA versija (20260826_shop_real_packs.sql)
create or replace function public.rvn__grant_reward_payload(p_user uuid, p_payload jsonb, p_source_type text, p_source_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare el jsonb; v_cur text; v_amt int; v_it text; v_iid text; v_qty int; v_xpsrc text; v_pid uuid; v_cid text;
begin
  if p_user is null or p_payload is null then return '{}'::jsonb; end if;
  v_xpsrc := case when p_source_type = 'match' then 'match' else 'reward' end;
  for el in select * from jsonb_array_elements(p_payload) loop
    case el->>'type'
      when 'currency' then
        v_cur := el->>'currency'; v_amt := coalesce((el->>'amount')::int,0);
        if v_amt <> 0 then
          if    v_cur = 'silver'  then update public.profiles set gold    = gold    + v_amt where id = p_user;
          elsif v_cur = 'rubies'  then update public.profiles set rubies  = rubies  + v_amt where id = p_user;
          elsif v_cur = 'essence' then update public.profiles set essence = essence + v_amt where id = p_user;
          end if;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
            values (p_user, p_source_type, p_source_id, 'currency', v_cur, v_amt);
        end if;
      when 'account_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          insert into public.xp_transactions(user_id, amount, reason, source_type) values (p_user, v_amt, 'Atlygis', v_xpsrc);
          update public.profiles set xp_total = xp_total + v_amt where id = p_user;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'account_xp', v_amt);
        end if;
      when 'season_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          perform public.rvn__add_pass_xp(p_user, v_amt);
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'season_xp', v_amt);
        end if;
      when 'item' then
        v_it := el->>'item_type'; v_iid := el->>'item_id'; v_qty := coalesce((el->>'quantity')::int,1);
        if v_it is not null and v_iid is not null then
          if v_it = 'pack' then
            v_pid := null;
            begin select id into v_pid from public.card_packs where id = v_iid::uuid and is_active; exception when others then v_pid := null; end;
            if v_pid is null then
              if v_iid ilike '%rare%' or v_iid ilike '%champion%' or v_iid ilike '%legendary%' then
                select id into v_pid from public.card_packs where is_active order by sort_order desc limit 1;
              else
                select id into v_pid from public.card_packs where is_active order by sort_order asc limit 1;
              end if;
            end if;
            if v_pid is not null then
              insert into public.user_pack_inventory(user_id, pack_id, quantity) values (p_user, v_pid, v_qty)
                on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + v_qty;
            end if;
          elsif v_it in ('card_back','player_avatar') then
            select id into v_cid from public.cosmetics where id = v_iid;
            if v_cid is not null then
              insert into public.user_cosmetics(user_id, cosmetic_id) values (p_user, v_cid) on conflict do nothing;
            else
              insert into public.user_inventory(user_id, item_type, item_id, quantity) values (p_user, v_it, v_iid, v_qty)
                on conflict (user_id, item_type, item_id) do update set quantity = public.user_inventory.quantity + v_qty, updated_at = now();
            end if;
          else
            insert into public.user_inventory(user_id, item_type, item_id, quantity) values (p_user, v_it, v_iid, v_qty)
              on conflict (user_id, item_type, item_id) do update set quantity = public.user_inventory.quantity + v_qty, updated_at = now();
          end if;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
            values (p_user, p_source_type, p_source_id, 'item', v_it, v_iid, v_qty);
        end if;
      else null;
    end case;
  end loop;
  return (select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence) from public.profiles where id = p_user);
end $$;

create or replace function public.rvn__check_level_rewards(p_user uuid)
returns void language plpgsql as $$ begin return; end $$;

create or replace function public.rvn__card_copy_limit(p_card uuid)
returns int language sql stable as $$
  select coalesce(r.copy_limit, 2) from public.cards c left join public.rarities r on r.id = c.rarity_id where c.id = p_card
$$;

-- ── SEED: produkcijos formos katalogas ──────────────────────────────────────
-- schema.sql id 1..5 yra seni EN placeholder'iai → paliekam tuščius, kad id
-- sekos sutaptų su gyva DB.
insert into public.factions(id, name, slug) values
  (1,'Fire','fire'),(2,'Shadow','shadow'),(3,'Nature','nature'),(4,'Arcane','arcane'),(5,'Neutral','neutral'),
  (6,'Mirties maršas','mirties-marsas'),
  (7,'Plėšikų naktis','plesiku-naktis'),
  (8,'Vryhioko gauja','vryhioko-gauja'),
  (9,'Demonų orda','demonu-orda'),
  (10,'Inkvizicijos legionas','inkvizicijos-legionas'),
  (11,'Šviesos pulkas','sviesos-pulkas'),
  (12,'Mistikos melodija','mistikos-melodija'),
  (13,'Rytų vėjas','rytu-vejas'),
  (14,'Universalus','universalus');
select setval('public.factions_id_seq', 14);

insert into public.rarities(id, name, copy_limit, sort_order) values
  (1,'Common',2,1),(2,'Magic',2,2),(3,'Rare',2,3),(4,'Epic',1,4),(5,'Legendary',1,5),
  (6,'Paprastas',2,1),(7,'Magiškas',2,2),(8,'Unikalus',2,3),(9,'Epiškas',1,4),(10,'Legendinis',1,5);
select setval('public.rarities_id_seq', 10);
-- gyvoje DB EN placeholder'iai nenaudojami — testuose juos išjungiam, kad
-- rarity paieška pagal sort_order rastų LT eilutes (kaip prod'e).
delete from public.rarities where id between 1 and 5;

insert into public.card_types(id, name, sort_order) values
  (1,'Padaras',1),(2,'Burtas',2),(3,'Artefaktas',3),(4,'Reakcija',4),(5,'Laukas',5),(6,'Čempionas',6),(7,'Prakeiksmas',7);
select setval('public.card_types_id_seq', 7);

-- Realistinis kortų katalogas: kiekvienai frakcijai po kelias kiekvieno rarity
do $$
declare f record; r record; i int;
begin
  for f in select id, slug from public.factions where id between 6 and 14 loop
    for r in select id, sort_order from public.rarities order by sort_order loop
      for i in 1..4 loop
        insert into public.cards(card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, image_url, status)
        values (f.slug || '-' || r.sort_order || '-' || i,
                initcap(replace(f.slug,'-',' ')) || ' ' || r.sort_order || '/' || i,
                f.id, 1, r.id, 100 * r.sort_order, r.sort_order, r.sort_order + 1,
                'Šauksmas — traukite kortą.', '/cards/' || f.slug || '/' || r.sort_order || '_' || i || '.webp', 'active');
      end loop;
    end loop;
  end loop;
end $$;

insert into public.card_translations(card_id, locale, name, effect_text)
  select id, 'en', 'EN ' || name, 'Battlecry — draw a card.' from public.cards;

insert into public.card_packs(name, cards_per_pack, sort_order) values ('Gėrio gynėjai',10,1), ('Tamsos aliansas',10,2);
insert into public.pack_factions(pack_id, faction_id)
  select p.id, f.id from public.card_packs p join public.factions f on true
  where p.name='Gėrio gynėjai' and f.slug in ('mistikos-melodija','inkvizicijos-legionas','sviesos-pulkas','rytu-vejas','universalus');
insert into public.pack_factions(pack_id, faction_id)
  select p.id, f.id from public.card_packs p join public.factions f on true
  where p.name='Tamsos aliansas' and f.slug in ('vryhioko-gauja','demonu-orda','mirties-marsas','plesiku-naktis','universalus');

insert into public.cosmetics(id, kind, name, sort_order) values
  ('cb_season_q3_2026','card_back','Sezono nugarėlė',400),
  ('av_season_q3_2026','avatar','Sezono avataras',401);

insert into public.economy_config(key, value) values
  ('craft', '{"disenchant":{"1":10,"2":25,"3":75,"4":250,"5":800,"6":1200},"craft":{"1":40,"2":100,"3":300,"4":1000,"5":2400,"6":3600},"max_copies":{"1":3,"2":3,"3":3,"4":2,"5":1,"6":1}}'::jsonb);

-- testinis sezonas (fiksuotas, kad rvn__current_season() nekurtų naujo)
insert into public.season_pass_seasons(id, title, theme, starts_at, ends_at, grace_end_date)
  values ('5ea50000-0000-4000-8000-000000000001','Testinis sezonas','Testas',
          date_trunc('day', now()) - interval '10 days', date_trunc('day', now()) + interval '80 days',
          date_trunc('day', now()) + interval '87 days');

-- ── Senų (v1) login progresų pavyzdžiai — backfill testavimui ───────────────
insert into public.profiles(id, username, gold) values
  ('60000000-0000-4000-8000-000000000001','legacy_12',0),
  ('60000000-0000-4000-8000-000000000002','legacy_35',0);
insert into public.user_monthly_login(user_id, month_key, day_number, date_key, claimed_at)
  select '60000000-0000-4000-8000-000000000001',
         to_char((now() at time zone 'utc')::date - g, 'YYYY-MM'), g,
         to_char((now() at time zone 'utc')::date - g, 'YYYY-MM-DD'),
         now() - (g || ' days')::interval
  from generate_series(1, 12) g;
insert into public.user_monthly_login(user_id, month_key, day_number, date_key, claimed_at)
  select '60000000-0000-4000-8000-000000000002',
         to_char((now() at time zone 'utc')::date - g, 'YYYY-MM'), g,
         to_char((now() at time zone 'utc')::date - g, 'YYYY-MM-DD'),
         now() - (g || ' days')::interval
  from generate_series(1, 35) g;
