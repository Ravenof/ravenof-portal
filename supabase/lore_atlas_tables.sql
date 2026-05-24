-- ============================================================
-- Lore Atlas Tables — MVP migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Assumes update_updated_at_column() already exists (defined in schema.sql)

-- ─────────────────────────────────────────
-- 1. lore_eras
-- ─────────────────────────────────────────
create table if not exists lore_eras (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text unique not null,
  description    text,
  timeline_index int  not null default 0,
  status         text not null default 'published',
  sort_order     int  default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create trigger lore_eras_updated_at
  before update on lore_eras
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────
-- 2. lore_locations
-- ─────────────────────────────────────────
create table if not exists lore_locations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text    not null,
  slug                  text    unique not null,
  type                  text    not null default 'unknown',
  short_description     text,
  description           text,
  x                     numeric not null default 50,
  y                     numeric not null default 50,
  region                text,
  faction_ids           text[]  default '{}',
  related_event_ids     text[]  default '{}',
  related_character_ids text[]  default '{}',
  related_artifact_ids  text[]  default '{}',
  related_card_numbers  text[]  default '{}',
  first_era_index       int     default 0,
  image_url             text,
  status                text    not null default 'draft',
  sort_order            int     default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create trigger lore_locations_updated_at
  before update on lore_locations
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────
-- 3. lore_events
-- ─────────────────────────────────────────
create table if not exists lore_events (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  slug                 text unique not null,
  summary              text,
  full_text            text,
  era_slug             text,
  timeline_index       int  default 0,
  location_slug        text,
  faction_ids          text[] default '{}',
  character_slugs      text[] default '{}',
  artifact_slugs       text[] default '{}',
  related_card_numbers text[] default '{}',
  source_type          text,
  source_title         text,
  event_type           text,
  status               text not null default 'draft',
  sort_order           int  default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create trigger lore_events_updated_at
  before update on lore_events
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────
-- 4. lore_characters
-- ─────────────────────────────────────────
create table if not exists lore_characters (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text unique not null,
  faction_id           text,
  role                 text,
  status_value         text default 'unknown',
  short_description    text,
  description          text,
  related_event_slugs  text[] default '{}',
  related_card_numbers text[] default '{}',
  image_url            text,
  status               text not null default 'draft',
  sort_order           int  default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create trigger lore_characters_updated_at
  before update on lore_characters
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────
-- 5. lore_artifacts
-- ─────────────────────────────────────────
create table if not exists lore_artifacts (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text unique not null,
  artifact_type          text,
  short_description      text,
  description            text,
  current_location_slug  text,
  related_event_slugs    text[] default '{}',
  related_card_numbers   text[] default '{}',
  image_url              text,
  status                 text not null default 'draft',
  sort_order             int  default 0,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create trigger lore_artifacts_updated_at
  before update on lore_artifacts
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────
-- 6. lore_sources
-- ─────────────────────────────────────────
create table if not exists lore_sources (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null,
  slug                     text unique not null,
  type                     text default 'novel',
  summary                  text,
  chapter_count            int,
  related_event_slugs      text[] default '{}',
  related_character_slugs  text[] default '{}',
  related_location_slugs   text[] default '{}',
  status                   text not null default 'draft',
  sort_order               int  default 0,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create trigger lore_sources_updated_at
  before update on lore_sources
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────
-- 7. Row Level Security
-- ─────────────────────────────────────────

-- Enable RLS on all lore tables
alter table lore_eras        enable row level security;
alter table lore_locations   enable row level security;
alter table lore_events      enable row level security;
alter table lore_characters  enable row level security;
alter table lore_artifacts   enable row level security;
alter table lore_sources     enable row level security;

-- Public can read published rows only
create policy "Public read published lore_eras"
  on lore_eras for select
  using (status = 'published');

create policy "Public read published lore_locations"
  on lore_locations for select
  using (status = 'published');

create policy "Public read published lore_events"
  on lore_events for select
  using (status = 'published');

create policy "Public read published lore_characters"
  on lore_characters for select
  using (status = 'published');

create policy "Public read published lore_artifacts"
  on lore_artifacts for select
  using (status = 'published');

create policy "Public read published lore_sources"
  on lore_sources for select
  using (status = 'published');

-- Admins can read, insert, update, delete all rows
create policy "Admin full access lore_eras"
  on lore_eras for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admin full access lore_locations"
  on lore_locations for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admin full access lore_events"
  on lore_events for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admin full access lore_characters"
  on lore_characters for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admin full access lore_artifacts"
  on lore_artifacts for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admin full access lore_sources"
  on lore_sources for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
