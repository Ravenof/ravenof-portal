-- ============================================================
-- LORE ATLAS V2 — periodai, lokacijų būsenos, įvykių grandinės
-- Paleisti: Supabase Dashboard -> SQL Editor (idempotentiška)
-- BŪTINA paleisti PRIEŠ deploy'inant Atlas v2 kodą.
-- ============================================================

-- ── 1. Periodai (mažesni laikotarpiai eros viduje) ──────────
create table if not exists lore_periods (
  id             uuid primary key default gen_random_uuid(),
  era_slug       text not null,
  name           text not null,
  slug           text unique not null,
  description    text,
  timeline_index int  not null default 0,
  status         text not null default 'published',
  sort_order     int  default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

drop trigger if exists lore_periods_updated_at on lore_periods;
create trigger lore_periods_updated_at
  before update on lore_periods
  for each row execute function update_updated_at_column();

-- ── 2. Lokacijų būsenos pagal periodą (carry-forward: rodomas
--      paskutinis įrašas <= aktyvus periodas; vėlesni gali būti tušti) ──
create table if not exists lore_location_states (
  id            uuid primary key default gen_random_uuid(),
  location_slug text not null,
  period_slug   text not null,
  description   text,
  image_url     text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (location_slug, period_slug)
);

drop trigger if exists lore_location_states_updated_at on lore_location_states;
create trigger lore_location_states_updated_at
  before update on lore_location_states
  for each row execute function update_updated_at_column();

-- ── 3. Įvykių grandinė + periodas ────────────────────────────
alter table public.lore_events add column if not exists period_slug         text;
alter table public.lore_events add column if not exists previous_event_slug text;

-- ── 4. RLS ───────────────────────────────────────────────────
alter table lore_periods         enable row level security;
alter table lore_location_states enable row level security;

drop policy if exists "Public read published lore_periods" on lore_periods;
create policy "Public read published lore_periods"
  on lore_periods for select
  using (status = 'published');

drop policy if exists "Public read lore_location_states" on lore_location_states;
create policy "Public read lore_location_states"
  on lore_location_states for select
  using (true);

drop policy if exists "Admin full access lore_periods" on lore_periods;
create policy "Admin full access lore_periods"
  on lore_periods for all
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

drop policy if exists "Admin full access lore_location_states" on lore_location_states;
create policy "Admin full access lore_location_states"
  on lore_location_states for all
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
