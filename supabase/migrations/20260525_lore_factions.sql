-- ── Lore Factions table ─────────────────────────────────────────────────────
-- Stores named factions/groups with their display color.
-- Locations reference factions by slug in their faction_ids text[] column.

create table if not exists public.lore_factions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  color       text not null default '#d4af37',
  description text,
  sort_order  int  not null default 0,
  status      text not null default 'draft' check (status in ('draft','published','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Updated-at trigger (reuse existing helper if available)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists lore_factions_updated_at on public.lore_factions;
create trigger lore_factions_updated_at
  before update on public.lore_factions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.lore_factions enable row level security;

create policy "lore_factions_public_read"
  on public.lore_factions for select
  using (status = 'published');

create policy "lore_factions_admin_all"
  on public.lore_factions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Seed a few starter factions so the admin isn't empty
insert into public.lore_factions (name, slug, color, description, sort_order, status)
values
  ('Ravenof Valdovai',  'ravenof-valdovai',  '#d4af37', 'Senoji miesto valdančioji grupė.',        0, 'published'),
  ('Tamsos Gildija',    'tamsos-gildija',    '#8b5cf6', 'Slaptoji organizacija šešėliuose.',       1, 'published'),
  ('Pakrančių Pirkliai','pakranciu-pirkliai','#0ea5e9', 'Uostų ir prekybos tinklų kontrolieriai.', 2, 'published'),
  ('Miško Sargai',      'misko-sargai',      '#22c55e', 'Senovinių miškų ir plyšių sargai.',       3, 'published')
on conflict (slug) do nothing;
