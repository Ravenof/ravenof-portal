-- ============================================================
-- RAVENOF PORTAL — MVP 1A SQL SCHEMA
-- Paleisti Supabase SQL Editor'e šia eilės tvarka
-- ============================================================

-- 1. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- 2. Helper: auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- REFERENCE TABLES
-- ============================================================

create table if not exists factions (
  id          serial      primary key,
  name        text        unique not null,
  slug        text        unique not null,
  color_hex   text        not null default '#9ca3af',
  icon_url    text,
  description text,
  sort_order  int         not null default 0
);

create table if not exists card_types (
  id         serial  primary key,
  name       text    unique not null,
  sort_order int     not null default 0
);

create table if not exists rarities (
  id          serial  primary key,
  name        text    unique not null,
  copy_limit  int     not null default 2,
  sort_order  int     not null default 0,
  color_hex   text    not null default '#9ca3af'
);

create table if not exists keywords (
  id          serial  primary key,
  name        text    unique not null,
  description text
);

-- ============================================================
-- SEED DATA
-- ============================================================

insert into factions (name, slug, color_hex, sort_order) values
  ('Fire',    'fire',    '#ef4444', 1),
  ('Shadow',  'shadow',  '#8b5cf6', 2),
  ('Nature',  'nature',  '#22c55e', 3),
  ('Arcane',  'arcane',  '#60a5fa', 4),
  ('Neutral', 'neutral', '#9ca3af', 5)
on conflict (slug) do nothing;

insert into card_types (name, sort_order) values
  ('Unit',      1),
  ('Spell',     2),
  ('Champion',  3),
  ('Structure', 4),
  ('Relic',     5)
on conflict (name) do nothing;

insert into rarities (name, copy_limit, sort_order, color_hex) values
  ('Common',    2, 1, '#9ca3af'),
  ('Magic',     2, 2, '#60a5fa'),
  ('Rare',      2, 3, '#a855f7'),
  ('Epic',      1, 4, '#f97316'),
  ('Legendary', 1, 5, '#f59e0b')
on conflict (name) do nothing;

insert into keywords (name, description) values
  ('Flying',     'Gali atakuoti tik skraidančias kortas'),
  ('Aggressive', 'Atakuoja iš karto, kai ateina į lauką'),
  ('Brave',      'Nepasitraukia iš mūšio'),
  ('Stealth',    'Pirmą ėjimą negali būti atakuojamas'),
  ('Leader',     '+1/+1 kitoms tavo kortoms')
on conflict (name) do nothing;

-- ============================================================
-- CARDS
-- ============================================================

create table if not exists cards (
  id             uuid         primary key default gen_random_uuid(),
  card_number    text,
  name           text         not null,
  faction_id     int          references factions(id) on delete set null,
  card_type_id   int          references card_types(id) on delete set null,
  rarity_id      int          references rarities(id) on delete set null,
  gold_cost      int          check (gold_cost >= 0),
  attack         int          check (attack >= 0),
  health         int          check (health >= 0),
  description    text,
  effect_text    text,
  image_url      text,
  is_champion    boolean      not null default false,
  status         text         not null default 'draft'
                              check (status in ('active', 'hidden', 'draft', 'banned')),
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now(),
  search_vector  tsvector     generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(effect_text, '')
    )
  ) stored
);

create index if not exists idx_cards_faction_id  on cards(faction_id);
create index if not exists idx_cards_type_id     on cards(card_type_id);
create index if not exists idx_cards_rarity_id   on cards(rarity_id);
create index if not exists idx_cards_status      on cards(status);
create index if not exists idx_cards_gold_cost   on cards(gold_cost);
create index if not exists idx_cards_fts         on cards using gin(search_vector);
create index if not exists idx_cards_name_trgm   on cards using gin(name gin_trgm_ops);

drop trigger if exists trg_cards_updated_at on cards;
create trigger trg_cards_updated_at
  before update on cards
  for each row execute function update_updated_at_column();

create table if not exists card_keywords (
  card_id    uuid  not null references cards(id) on delete cascade,
  keyword_id int   not null references keywords(id) on delete cascade,
  primary key (card_id, keyword_id)
);

create index if not exists idx_card_keywords_card on card_keywords(card_id);

-- ============================================================
-- TEST CARDS (8 kortos)
-- ============================================================

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, description, effect_text, status)
select 'BASE-001','Ugnies Drakonas',
  (select id from factions where slug='fire'),
  (select id from card_types where name='Unit'),
  (select id from rarities where name='Rare'),
  4,5,3,'Senas drakonas, kurio ugnis degina viską savo kelyje.',
  'Kai ateina į lauką: padaro 2 žalos pasirinktam priešo taikiniui.','active'
where not exists (select 1 from cards where card_number='BASE-001');

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, description, status)
select 'BASE-002','Šešėlių Žudikas',
  (select id from factions where slug='shadow'),
  (select id from card_types where name='Unit'),
  (select id from rarities where name='Common'),
  2,3,1,'Greitesnis nei akis mato, mirtinesnis nei baimė.','active'
where not exists (select 1 from cards where card_number='BASE-002');

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, description, effect_text, status)
select 'BASE-003','Gamtos Sargybinis',
  (select id from factions where slug='nature'),
  (select id from card_types where name='Unit'),
  (select id from rarities where name='Common'),
  3,2,4,'Miškų gynėjas, senas kaip pats Ravenof.',
  'Kol gyvas: visi tavo gyvūnai gauna +1 sveikatą.','active'
where not exists (select 1 from cards where card_number='BASE-003');

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, description, effect_text, is_champion, status)
select 'BASE-004','Arkanos Meistras',
  (select id from factions where slug='arcane'),
  (select id from card_types where name='Champion'),
  (select id from rarities where name='Legendary'),
  6,4,6,'Šimtmečius studijavęs magiją, dabar ji jo vergas.',
  'Žaidimo pradžioje: prideda 1 atsitiktinį burtą į tavo ranką.',true,'active'
where not exists (select 1 from cards where card_number='BASE-004');

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, description, effect_text, is_champion, status)
select 'BASE-005','Ravenof Sargas',
  (select id from factions where slug='neutral'),
  (select id from card_types where name='Champion'),
  (select id from rarities where name='Epic'),
  5,3,5,'Niekam nepriklauso, bet visus saugo.',
  'Nemiršta nuo pirmojo smūgio.',true,'active'
where not exists (select 1 from cards where card_number='BASE-005');

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, description, effect_text, status)
select 'BASE-006','Ugnies Kultas',
  (select id from factions where slug='fire'),
  (select id from card_types where name='Spell'),
  (select id from rarities where name='Magic'),
  2,'Ugnis valo. Ugnis gydo. Ugnis naikina.',
  'Padaro 3 žalos priešininkui arba 1 žalą visai priešo armijai.','active'
where not exists (select 1 from cards where card_number='BASE-006');

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, health, description, effect_text, status)
select 'BASE-007','Šešėlių Bokštas',
  (select id from factions where slug='shadow'),
  (select id from card_types where name='Structure'),
  (select id from rarities where name='Rare'),
  4,6,'Iš šio bokšto niekada nesitraukiama.',
  'Kiekvieną ėjimą: sukuria 1/1 Šešėlių Sargą.','active'
where not exists (select 1 from cards where card_number='BASE-007');

insert into cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, description, effect_text, status)
select 'BASE-008','Gamtos Vainikai',
  (select id from factions where slug='nature'),
  (select id from card_types where name='Spell'),
  (select id from rarities where name='Common'),
  1,'Gyja žaizdos, gyja širdys.',
  'Atkuria 3 gyvybės taškų vienam tavo taikiniui.','active'
where not exists (select 1 from cards where card_number='BASE-008');

-- Keywords
insert into card_keywords (card_id, keyword_id)
select c.id, k.id from cards c, keywords k
where c.card_number='BASE-001' and k.name='Aggressive' on conflict do nothing;
insert into card_keywords (card_id, keyword_id)
select c.id, k.id from cards c, keywords k
where c.card_number='BASE-001' and k.name='Flying' on conflict do nothing;
insert into card_keywords (card_id, keyword_id)
select c.id, k.id from cards c, keywords k
where c.card_number='BASE-004' and k.name='Leader' on conflict do nothing;
insert into card_keywords (card_id, keyword_id)
select c.id, k.id from cards c, keywords k
where c.card_number='BASE-005' and k.name='Brave' on conflict do nothing;

-- ============================================================
-- PROFILES
-- ============================================================

create table if not exists profiles (
  id               uuid         primary key references auth.users(id) on delete cascade,
  username         text         unique not null,
  display_name     text,
  avatar_url       text,
  bio              text,
  is_public        boolean      not null default true,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create index if not exists idx_profiles_username on profiles(username);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username  text;
  final_username text;
  counter        int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  base_username := left(base_username, 16);
  if length(base_username) < 3 then base_username := 'user'; end if;
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || '_' || counter::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, final_username,
    coalesce(new.raw_user_meta_data->>'full_name', final_username));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

-- ============================================================
-- USER COLLECTIONS
-- ============================================================

create table if not exists user_collections (
  id         uuid         primary key default gen_random_uuid(),
  user_id    uuid         not null references profiles(id) on delete cascade,
  card_id    uuid         not null references cards(id) on delete cascade,
  quantity   int          not null default 1 check (quantity >= 0),
  created_at timestamptz  not null default now(),
  updated_at timestamptz  not null default now(),
  unique (user_id, card_id)
);

create index if not exists idx_user_coll_user on user_collections(user_id);
create index if not exists idx_user_coll_card on user_collections(card_id);

drop trigger if exists trg_user_coll_updated_at on user_collections;
create trigger trg_user_coll_updated_at
  before update on user_collections
  for each row execute function update_updated_at_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
alter table factions          enable row level security;
alter table card_types        enable row level security;
alter table rarities          enable row level security;
alter table keywords          enable row level security;
alter table cards             enable row level security;
alter table card_keywords     enable row level security;
alter table profiles          enable row level security;
alter table user_collections  enable row level security;

-- Reference tables: visi gali skaityti
drop policy if exists "Public read factions"     on factions;
drop policy if exists "Public read card_types"   on card_types;
drop policy if exists "Public read rarities"     on rarities;
drop policy if exists "Public read keywords"     on keywords;
create policy "Public read factions"   on factions    for select using (true);
create policy "Public read card_types" on card_types  for select using (true);
create policy "Public read rarities"   on rarities    for select using (true);
create policy "Public read keywords"   on keywords    for select using (true);

-- Cards: active matomi visiems
drop policy if exists "Active cards public"         on cards;
drop policy if exists "Active card keywords public" on card_keywords;
create policy "Active cards public"
  on cards for select using (status = 'active');
create policy "Active card keywords public"
  on card_keywords for select using (
    exists (select 1 from cards c where c.id = card_id and c.status = 'active')
  );

-- Profiles
drop policy if exists "Public profiles viewable" on profiles;
drop policy if exists "Users insert own profile"  on profiles;
drop policy if exists "Users update own profile"  on profiles;
create policy "Public profiles viewable"
  on profiles for select using (is_public = true or auth.uid() = id);
create policy "Users insert own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

-- User collections: tik savininkas
drop policy if exists "Users read own collection"   on user_collections;
drop policy if exists "Users insert own collection" on user_collections;
drop policy if exists "Users update own collection" on user_collections;
drop policy if exists "Users delete own collection" on user_collections;
create policy "Users read own collection"
  on user_collections for select using (auth.uid() = user_id);
create policy "Users insert own collection"
  on user_collections for insert with check (auth.uid() = user_id);
create policy "Users update own collection"
  on user_collections for update using (auth.uid() = user_id);
create policy "Users delete own collection"
  on user_collections for delete using (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Paleisti po visko:
-- select count(*) from cards where status = 'active';  -- turi būti 8
-- select count(*) from factions;                        -- turi būti 5
