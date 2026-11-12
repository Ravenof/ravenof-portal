-- ═══════════════════════════════════════
-- Kovų prieš DI žurnalai (commit772) – DI gerinimui pagal tikras žaidėjų kovas.
-- Klientas po kiekvienos kovos prieš botą įrašo suspaustą ėjimų žurnalą ir būsenos nuotraukas
-- kiekvieno ėjimo pradžioje. Žaidėjas mato tik savo įrašus, adminas – visus.
-- Saugoma 90 dienų (valymas – įrašant naują eilutę, be cron).
-- ═══════════════════════════════════════
create table if not exists public.bot_match_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_match_id text,
  created_at timestamptz not null default now(),
  app_version text,
  mode text,
  difficulty text,
  opponent_deck text,
  ai_deck_kind text,
  format text,
  result text,
  turns int,
  duration_seconds int,
  player_hp int,
  ai_hp int,
  ai_deck jsonb,
  player_deck jsonb,
  snaps jsonb,
  log jsonb
);
create index if not exists bot_match_logs_created_idx on public.bot_match_logs (created_at desc);
create index if not exists bot_match_logs_user_idx on public.bot_match_logs (user_id, created_at desc);

alter table public.bot_match_logs enable row level security;
drop policy if exists bot_match_logs_insert_own on public.bot_match_logs;
create policy bot_match_logs_insert_own on public.bot_match_logs for insert with check (auth.uid() = user_id);
drop policy if exists bot_match_logs_read on public.bot_match_logs;
create policy bot_match_logs_read on public.bot_match_logs for select using (auth.uid() = user_id or public.is_admin());
grant insert, select on public.bot_match_logs to authenticated;

create or replace function public.bot_match_logs_prune() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.bot_match_logs where created_at < now() - interval '90 days';
  return null;
end $$;
drop trigger if exists trg_bot_match_logs_prune on public.bot_match_logs;
create trigger trg_bot_match_logs_prune after insert on public.bot_match_logs for each statement execute function public.bot_match_logs_prune();
