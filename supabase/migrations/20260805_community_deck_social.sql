-- ══════════════════════════════════════════════════════════════════════════════
-- Bendruomenės kaladžių socialinis papildymas (/digital).
-- PASTABA: deck_votes (vote stulpelis) ir deck_comments (status modelis) su
-- score trigeriu DB JAU EGZISTUOJA (web portalo Community Decks) — jų neliečiam.
-- Čia tik tai, ko trūksta:
--  • deck_comment_votes   — komentarų balsai (1 user = 1 balsas -1/+1)
--  • deck_comment_reports — komentarų reportai (mato tik adminas)
--  • rvn_copy_community_deck — PILNAS viešos kaladės kopijavimas su side deck,
--    nepriklausomai nuo turimų kortų (fix: kopijuodavosi nepilnai)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1) Komentarų balsai ───────────────────────────────────────────────────────
create table if not exists public.deck_comment_votes (
  comment_id uuid not null references public.deck_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
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

-- ── 2) Komentarų reportai ─────────────────────────────────────────────────────
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

-- ── 3) Pilnas viešos kaladės kopijavimas ─────────────────────────────────────
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
