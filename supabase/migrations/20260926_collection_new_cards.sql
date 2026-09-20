-- ════════════════════════════════════════════════════════════════════════════
--  NAUJOS KORTOS KOLEKCIJOJE (2026-09-20, playtest)
--  ─────────────────────────────────────────────────────────────────────────
--   • user_collections.is_new – korta, kurios žaidėjas dar nebuvo matęs
--     kolekcijoje (pirma tos kortos kopija). Nusiimna, kai žaidėjas ją peržiūri
--     arba paspaudžia „pažymėti kaip matytas".
--   • user_collections.first_obtained_at – kada gauta pirma kopija.
--   • Žyma dedama TRIGERIU ant insert'o, tad veikia VISI šaltiniai
--     (boosteris, kortos pasirinkimas, starter kaladė, craft, dienos pasiūlymas)
--     ir nereikia liesti nė vienos esamos funkcijos.
--   • Esamos kolekcijos NEpažymimos naujomis (kitaip filtras būtų beprasmis).
--  Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.user_collections add column if not exists is_new boolean not null default false;
alter table public.user_collections add column if not exists first_obtained_at timestamptz;

-- Senoms eilutėms – data (jei nėra) ir „ne nauja"
update public.user_collections
   set first_obtained_at = coalesce(first_obtained_at, now())
 where first_obtained_at is null;

create index if not exists user_collections_new_idx
  on public.user_collections (user_id) where is_new;

-- ── Trigeris: kiekviena PIRMA kortos kopija = nauja ─────────────────────────
create or replace function public.rvn__collection_mark_new()
returns trigger language plpgsql as $$
begin
  new.is_new := true;
  new.first_obtained_at := coalesce(new.first_obtained_at, now());
  return new;
end $$;

drop trigger if exists trg_collection_mark_new on public.user_collections;
create trigger trg_collection_mark_new
  before insert on public.user_collections
  for each row execute function public.rvn__collection_mark_new();

-- ── Pažymėti matytomis ─────────────────────────────────────────────────────
--  p_card_ids = null → visos žaidėjo kortos; kitaip tik nurodytos.
--  Grąžina, kiek žymų nuimta.
create or replace function public.rvn_mark_collection_seen(p_card_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n int := 0;
begin
  if v_uid is null then return 0; end if;
  update public.user_collections
     set is_new = false
   where user_id = v_uid and is_new
     and (p_card_ids is null or card_id = any(p_card_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

grant execute on function public.rvn_mark_collection_seen(uuid[]) to authenticated;
