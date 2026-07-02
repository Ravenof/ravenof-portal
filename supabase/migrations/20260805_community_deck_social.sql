-- ══════════════════════════════════════════════════════════════════════════════
-- Bendruomenės kaladžių socialinė sistema:
--  • deck_votes — vienas useris = vienas balsas (-1/+1), decks.score = sum(votes)
--  • deck_comments — komentarai po kaladėmis (adminas gali šalinti)
--  • deck_comment_votes / deck_comment_reports — komentarų balsai ir reportai
--  • rvn_copy_community_deck — PILNAS viešos kaladės kopijavimas (su side deck,
--    nepriklausomai nuo turimų kortų)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1) Kaladžių balsai ────────────────────────────────────────────────────────
create table if not exists public.deck_votes (
  deck_id    uuid not null references public.decks(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (deck_id, user_id)
);
alter table public.deck_votes enable row level security;
drop policy if exists deck_votes_read on public.deck_votes;
create policy deck_votes_read on public.deck_votes for select using (true);
drop policy if exists deck_votes_ins on public.deck_votes;
create policy deck_votes_ins on public.deck_votes for insert with check (user_id = auth.uid());
drop policy if exists deck_votes_upd on public.deck_votes;
create policy deck_votes_upd on public.deck_votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists deck_votes_del on public.deck_votes;
create policy deck_votes_del on public.deck_votes for delete using (user_id = auth.uid());

create or replace function public.rvn_deck_score_refresh() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_deck uuid;
begin
  v_deck := coalesce(new.deck_id, old.deck_id);
  update public.decks
     set score = coalesce((select sum(value) from public.deck_votes where deck_id = v_deck), 0)
   where id = v_deck;
  return null;
end $$;
drop trigger if exists trg_deck_votes_score on public.deck_votes;
create trigger trg_deck_votes_score
  after insert or update or delete on public.deck_votes
  for each row execute function public.rvn_deck_score_refresh();

-- ── 2) Komentarai ─────────────────────────────────────────────────────────────
create table if not exists public.deck_comments (
  id         uuid primary key default gen_random_uuid(),
  deck_id    uuid not null references public.decks(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  removed    boolean not null default false,
  removed_by uuid references public.profiles(id),
  removed_at timestamptz
);
create index if not exists idx_deck_comments_deck on public.deck_comments(deck_id, created_at desc);
alter table public.deck_comments enable row level security;
drop policy if exists deck_comments_read on public.deck_comments;
create policy deck_comments_read on public.deck_comments
  for select using (removed = false or user_id = auth.uid() or public.is_admin());
drop policy if exists deck_comments_ins on public.deck_comments;
create policy deck_comments_ins on public.deck_comments
  for insert with check (user_id = auth.uid() and removed = false);
-- šalinimas (removed=true): pats autorius arba adminas
drop policy if exists deck_comments_upd on public.deck_comments;
create policy deck_comments_upd on public.deck_comments
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── 3) Komentarų balsai ───────────────────────────────────────────────────────
create table if not exists public.deck_comment_votes (
  comment_id uuid not null references public.deck_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  primary key (comment_id, user_id)
);
alter table public.deck_comment_votes enable row level security;
drop policy if exists dcv_read on public.deck_comment_votes;
create policy dcv_read on public.deck_comment_votes for select using (true);
drop policy if exists dcv_ins on public.deck_comment_votes;
create policy dcv_ins on public.deck_comment_votes for insert with check (user_id = auth.uid());
drop policy if exists dcv_upd on public.deck_comment_votes;
create policy dcv_upd on public.deck_comment_votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dcv_del on public.deck_comment_votes;
create policy dcv_del on public.deck_comment_votes for delete using (user_id = auth.uid());

-- ── 4) Komentarų reportai ─────────────────────────────────────────────────────
create table if not exists public.deck_comment_reports (
  comment_id uuid not null references public.deck_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.deck_comment_reports enable row level security;
drop policy if exists dcr_read on public.deck_comment_reports;
create policy dcr_read on public.deck_comment_reports for select using (public.is_admin());
drop policy if exists dcr_ins on public.deck_comment_reports;
create policy dcr_ins on public.deck_comment_reports for insert with check (user_id = auth.uid());

-- ── 5) Pilnas viešos kaladės kopijavimas ─────────────────────────────────────
create or replace function public.rvn_copy_community_deck(p_deck_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_new uuid;
  v_src public.decks%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_src from public.decks where id = p_deck_id and (visibility = 'public' or user_id = v_uid);
  if not found then raise exception 'deck not found or not public'; end if;
  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
  values (v_uid, left(v_src.name || ' (kopija)', 80), v_src.description, v_src.faction_id, 'private', v_src.card_count, v_src.avg_gold_cost)
  returning id into v_new;
  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
  select v_new, card_id, quantity, coalesce(is_side_deck, false)
    from public.deck_cards where deck_id = p_deck_id;
  return v_new;
end $$;
grant execute on function public.rvn_copy_community_deck(uuid) to authenticated;
