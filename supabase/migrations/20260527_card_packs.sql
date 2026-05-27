-- ── Card Packs system ────────────────────────────────────────────────────────
-- card_packs: pack definitions
-- pack_card_pool: which cards can appear (with weight)
-- user_pack_openings: audit log of what each user opened

create table if not exists public.card_packs (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  description   text,
  image_url     text,
  cards_per_pack int        not null default 5,
  daily_limit   int         not null default 1,  -- opens per user per day (0 = unlimited)
  is_active     boolean     not null default true,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.pack_card_pool (
  id       uuid    primary key default gen_random_uuid(),
  pack_id  uuid    not null references public.card_packs(id) on delete cascade,
  card_id  uuid    not null references public.cards(id)      on delete cascade,
  weight   int     not null default 10,   -- relative probability (higher = more common)
  unique(pack_id, card_id)
);

create table if not exists public.user_pack_openings (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  pack_id         uuid        not null references public.card_packs(id) on delete cascade,
  cards_received  uuid[]      not null,
  opened_at       timestamptz not null default now()
);

-- Indexes
create index if not exists idx_pack_card_pool_pack  on public.pack_card_pool(pack_id);
create index if not exists idx_user_pack_openings_user_pack
  on public.user_pack_openings(user_id, pack_id, opened_at);

-- RLS
alter table public.card_packs          enable row level security;
alter table public.pack_card_pool      enable row level security;
alter table public.user_pack_openings  enable row level security;

-- card_packs: public can see active packs; admin manages all
create policy "card_packs_public_read"   on public.card_packs
  for select using (is_active = true);
create policy "card_packs_admin_all"     on public.card_packs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- pack_card_pool: public read; admin manage
create policy "pack_pool_public_read"    on public.pack_card_pool
  for select using (true);
create policy "pack_pool_admin_all"      on public.pack_card_pool
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- user_pack_openings: user sees own; admin sees all; insert via server action
create policy "openings_own_read"        on public.user_pack_openings
  for select using (user_id = auth.uid());
create policy "openings_admin_read"      on public.user_pack_openings
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "openings_insert"          on public.user_pack_openings
  for insert with check (user_id = auth.uid());
