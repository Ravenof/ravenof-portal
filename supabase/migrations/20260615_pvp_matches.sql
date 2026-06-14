-- ── PvP realtime kovos: kambariai + atsitiktinė eilė ─────────────────────────
-- Client-authoritative: host'as sukasi engine, būsena sinchronizuojama per
-- Supabase Realtime broadcast. Ši lentelė – tik matchmaking / kambario būsena.

create table if not exists public.pvp_matches (
  id            uuid primary key default gen_random_uuid(),
  code          text unique,                       -- privataus kambario kodas (NULL random eilei)
  is_public     boolean not null default false,    -- true = atsitiktinė eilė
  status        text not null default 'waiting',   -- waiting | ready | active | finished | abandoned
  host_id       uuid not null references auth.users(id) on delete cascade,
  host_deck_id  uuid not null references public.decks(id) on delete cascade,
  host_name     text,
  guest_id      uuid references auth.users(id) on delete cascade,
  guest_deck_id uuid references public.decks(id) on delete cascade,
  guest_name    text,
  winner        text,                              -- 'host' | 'guest' | NULL
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pvp_matches_status_idx on public.pvp_matches (status, is_public, created_at);
create index if not exists pvp_matches_code_idx   on public.pvp_matches (code);
create index if not exists pvp_matches_host_idx   on public.pvp_matches (host_id);
create index if not exists pvp_matches_guest_idx  on public.pvp_matches (guest_id);

alter table public.pvp_matches enable row level security;

drop policy if exists pvp_select on public.pvp_matches;
create policy pvp_select on public.pvp_matches for select
  to authenticated using (true);

drop policy if exists pvp_insert on public.pvp_matches;
create policy pvp_insert on public.pvp_matches for insert
  to authenticated with check (auth.uid() = host_id);

drop policy if exists pvp_update on public.pvp_matches;
create policy pvp_update on public.pvp_matches for update
  to authenticated
  using (
    auth.uid() = host_id
    or auth.uid() = guest_id
    or (status = 'waiting' and guest_id is null)
  )
  with check (auth.uid() = host_id or auth.uid() = guest_id);

drop policy if exists pvp_delete on public.pvp_matches;
create policy pvp_delete on public.pvp_matches for delete
  to authenticated using (auth.uid() = host_id);

create or replace function public.pvp_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists pvp_matches_touch on public.pvp_matches;
create trigger pvp_matches_touch before update on public.pvp_matches
  for each row execute function public.pvp_touch_updated_at();

alter publication supabase_realtime add table public.pvp_matches;
