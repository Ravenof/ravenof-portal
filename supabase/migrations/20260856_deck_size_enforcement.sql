-- ════════════════════════════════════════════════════════════════════════════
-- KALADĖS DYDŽIO TAISYKLĖ SERVERYJE (30–40 kortų pagrindinėje kaladėje).
-- Veidrodis: src/lib/deck-validation.ts (DECK_MIN/DECK_MAX) ir
-- src/lib/digital/activeDeck.ts (deckValidity). Frontend'as tik atspindi —
-- čia yra autoritetas. 29/41/58/60 kortų kaladės atmetamos:
--   • aktyvavimas (rvn_set_active_deck)
--   • bendruomenės kaladės kopijavimas (rvn_copy_community_deck)
--   • ranked kaladės fiksavimas + eilė (rvn_lock_ranked_deck, rvn_queue_join)
--   • PvP kova (pvp_matches trigger — host ir guest kaladės)
--   • publikavimas į bendruomenę (decks trigger)
-- Senos netinkamos viešos kaladės NEtrinamos — jos tiesiog nebegali būti
-- kopijuojamos/naudojamos, kol savininkas jų nepataisys.
-- Kampanijos kaladės ([Kampanija]%) NELIEČIAMOS.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0) Konstantos + tikras pagrindinės kalados dydis ─────────────────────────
create or replace function public.rvn__deck_main_count(p_deck uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(dc.quantity), 0)::int
  from public.deck_cards dc
  where dc.deck_id = p_deck and coalesce(dc.is_side_deck, false) = false
$$;

create or replace function public.rvn__deck_size_ok(p_deck uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.rvn__deck_main_count(p_deck) between 30 and 40
$$;

create or replace function public.rvn__is_campaign_deck(p_deck uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.decks d where d.id = p_deck and d.name ilike '[Kampanija]%')
$$;

-- ── 1) Vienkartinis duomenų remontas: card_count perskaičiuojamas iš deck_cards
-- (stulpelį iki šiol rašė tik klientas — pasitaiko pasenusių reikšmių).
update public.decks d
set card_count = public.rvn__deck_main_count(d.id)
where coalesce(d.card_count, -1) <> public.rvn__deck_main_count(d.id);

-- ── 2) Aktyvavimas: netinkamo dydžio kaladė negali tapti aktyvia ─────────────
create or replace function public.rvn_set_active_deck(p_deck uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_deck is not null then
    if not exists (select 1 from public.decks d where d.id = p_deck and d.user_id = v_uid) then
      raise exception 'ne tavo kaladė';
    end if;
    if not public.rvn__is_campaign_deck(p_deck) and not public.rvn__deck_size_ok(p_deck) then
      raise exception 'deck_size_invalid: leidžiama 30–40 kortų (dabar %)', public.rvn__deck_main_count(p_deck);
    end if;
  end if;
  update public.profiles set active_deck_id = p_deck where id = v_uid;
end $$;
grant execute on function public.rvn_set_active_deck(uuid) to authenticated;

-- ── 3) Bendruomenės kaladės kopijavimas: netinkamo dydžio šaltinis atmetamas ─
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
  if not public.rvn__deck_size_ok(p_deck_id) then
    raise exception 'deck_size_invalid: šios kalados dydis netinkamas (leidžiama 30–40 kortų)';
  end if;
  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
  values (v_uid, left(v_src.name || ' (kopija)', 80), v_src.description, v_src.faction_id, 'private',
          public.rvn__deck_main_count(p_deck_id), v_src.avg_gold_cost)
  returning id into v_new;
  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
  select v_new, card_id, quantity, coalesce(is_side_deck, false)
    from public.deck_cards where deck_id = p_deck_id;
  return v_new;
end $$;
grant execute on function public.rvn_copy_community_deck(uuid) to authenticated;

-- ── 4) Ranked: fiksavimas ir eilė tik su 30–40 kortų kalade ──────────────────
create or replace function public.rvn_lock_ranked_deck(p_deck_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_season public.ranked_seasons;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.decks where id = p_deck_id and user_id = auth.uid()) then
    raise exception 'deck not found or not owned';
  end if;
  if not public.rvn__deck_size_ok(p_deck_id) then
    raise exception 'deck_size_invalid: leidžiama 30–40 kortų (dabar %)', public.rvn__deck_main_count(p_deck_id);
  end if;
  v_season := public.rvn_active_season();
  perform public.rvn_ensure_ranked_profile();
  update public.ranked_profiles set locked_deck_id = p_deck_id
    where user_id = auth.uid() and season_id = v_season.id;
end $$;

create or replace function public.rvn_queue_join(p_deck_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_season public.ranked_seasons; v_p public.ranked_profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.decks where id=p_deck_id and user_id=v_uid) then raise exception 'invalid deck'; end if;
  if not public.rvn__deck_size_ok(p_deck_id) then
    raise exception 'deck_size_invalid: leidžiama 30–40 kortų (dabar %)', public.rvn__deck_main_count(p_deck_id);
  end if;
  v_season := public.rvn_active_season();
  v_p := public.rvn_ensure_ranked_profile();
  insert into public.ranked_queue (user_id, season_id, rank_step, deck_id)
    values (v_uid, v_season.id, v_p.rank_step, p_deck_id)
    on conflict (user_id) do update set rank_step=excluded.rank_step, deck_id=excluded.deck_id, enqueued_at=now(), matched_with=null, match_id=null;
end $$;

-- ── 5) PvP kova: host/guest kaladės tikrinamos DB lygyje (apeiti neįmanoma) ──
create or replace function public.rvn__pvp_deck_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.host_deck_id is not null
     and (tg_op = 'INSERT' or new.host_deck_id is distinct from old.host_deck_id)
     and not public.rvn__deck_size_ok(new.host_deck_id) then
    raise exception 'deck_size_invalid: host kaladė turi turėti 30–40 kortų';
  end if;
  if new.guest_deck_id is not null
     and (tg_op = 'INSERT' or new.guest_deck_id is distinct from old.guest_deck_id)
     and not public.rvn__deck_size_ok(new.guest_deck_id) then
    raise exception 'deck_size_invalid: guest kaladė turi turėti 30–40 kortų';
  end if;
  return new;
end $$;

drop trigger if exists pvp_matches_deck_guard on public.pvp_matches;
create trigger pvp_matches_deck_guard before insert or update on public.pvp_matches
  for each row execute function public.rvn__pvp_deck_guard();

-- ── 6) Publikavimas: netinkamo dydžio kaladė negali tapti vieša ──────────────
-- (Tik kai kaladė JAU turi kortų — builder'is pirmiausia sukuria decks eilutę,
-- tada rašo deck_cards; tuščios „kuriamos" kaladės nepublikuojamos atskirai.)
create or replace function public.rvn__deck_publish_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cnt int;
begin
  if new.visibility = 'public'
     and (tg_op = 'INSERT' or coalesce(old.visibility, '') <> 'public')
     and new.name not ilike '[Kampanija]%' then
    v_cnt := public.rvn__deck_main_count(new.id);
    if v_cnt > 0 and (v_cnt < 30 or v_cnt > 40) then
      raise exception 'deck_size_invalid: publikuoti galima tik 30–40 kortų kaladę (dabar %)', v_cnt;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists decks_publish_guard on public.decks;
create trigger decks_publish_guard before insert or update on public.decks
  for each row execute function public.rvn__deck_publish_guard();
