-- ── Steam paskyrų susiejimas (prisijungimas per Steam desktop versijoje) ──────
-- Vienas Steam ID ↔ viena Ravenof paskyra. Rašo TIK edge funkcija steam-auth (service role).
create table if not exists public.steam_accounts (
  steam_id    text primary key,
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  persona     text,
  created_at  timestamptz not null default now(),
  last_login  timestamptz not null default now()
);
alter table public.steam_accounts enable row level security;
drop policy if exists "steam_accounts: own read" on public.steam_accounts;
create policy "steam_accounts: own read" on public.steam_accounts for select using (auth.uid() = user_id);
