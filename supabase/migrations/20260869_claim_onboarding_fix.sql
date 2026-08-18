-- ════════════════════════════════════════════════════════════════════════════
--  HOTFIX (commit628): migracija 20260868 rvn_claim_starter_deck perrašė
--  remdamasi PASENUSIA 20260718 versija — pamesta 20260827 v3 logika:
--  idempotencija ir digital_onboarded_at/active_deck_id žymėjimas po claim.
--  PASEKMĖ: naujas žaidėjas po kaladės pasirinkimo likdavo 'pending' būsenoje
--  ir /digital layout'as jį amžinai grąžindavo į onboarding (infinite loop).
--  Ši versija = 20260827 v3 (idempotencija + onboarding žymos) + 20260868
--  papildymai (is_side_deck kopijavimas; statistika tik iš pagrindinių kortų).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_claim_starter_deck(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_s public.starter_decks; v_gold int;
  v_count int; v_avg numeric; v_deck_id uuid; r record; v_first boolean;
  v_existing uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_s from public.starter_decks where id = p_id and is_active;
  if v_s.id is null then raise exception 'starter deck not found'; end if;

  -- Idempotencija: jau turima → grąžinam esamą deckId (ir užtikrinam onboarding žymą)
  select deck_id into v_existing from public.user_starter_deck_claims
    where user_id = v_uid and starter_deck_id = p_id;
  if v_existing is not null then
    update public.profiles set
      digital_onboarded_at = coalesce(digital_onboarded_at, now()),
      active_deck_id = coalesce(active_deck_id, v_existing)
      where id = v_uid;
    return jsonb_build_object('ok', true, 'deckId', v_existing, 'free', false, 'alreadyClaimed', true);
  end if;

  v_first := not exists (select 1 from public.user_starter_deck_claims where user_id = v_uid);

  -- kaina TIK jei tai NE pirmoji kaladė
  if not v_first and v_s.price_gold > 0 then
    select gold into v_gold from public.profiles where id = v_uid for update;
    if coalesce(v_gold, 0) < v_s.price_gold then raise exception 'not enough gold'; end if;
    update public.profiles set gold = gold - v_s.price_gold where id = v_uid;
  end if;

  -- kortos į kolekciją (ir pagrindinės, ir prakeiksmai — kolekcinės kortos)
  for r in select card_id, quantity from public.starter_deck_cards where starter_deck_id = p_id loop
    insert into public.user_collections (user_id, card_id, quantity)
      values (v_uid, r.card_id, r.quantity)
      on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + r.quantity;
  end loop;

  -- statistika TIK iš pagrindinės kaladės (šoninė nesiskaito į 30–40)
  select coalesce(sum(sdc.quantity), 0),
         coalesce(round(sum(coalesce(c.gold_cost, 0) * sdc.quantity)::numeric / nullif(sum(sdc.quantity), 0), 2), 0)
    into v_count, v_avg
    from public.starter_deck_cards sdc join public.cards c on c.id = sdc.card_id
    where sdc.starter_deck_id = p_id and not sdc.is_side_deck;

  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
    values (v_uid, v_s.name, coalesce(v_s.description, 'Starter kaladė'), v_s.faction_id, 'private', v_count, v_avg)
    returning id into v_deck_id;

  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
    select v_deck_id, card_id, quantity, is_side_deck from public.starter_deck_cards where starter_deck_id = p_id;

  insert into public.user_starter_deck_claims (user_id, starter_deck_id, deck_id)
    values (v_uid, p_id, v_deck_id);

  -- Onboarding: pirmas claim pažymi baigtą onboarding + aktyvią kaladę
  update public.profiles set
    digital_onboarded_at = coalesce(digital_onboarded_at, now()),
    active_deck_id = coalesce(active_deck_id, v_deck_id)
    where id = v_uid;

  return jsonb_build_object('ok', true, 'deckId', v_deck_id, 'free', v_first, 'alreadyClaimed', false);
end $$;
grant execute on function public.rvn_claim_starter_deck(uuid) to authenticated;

-- Gelbėjimas jau įstrigusiems: kas turi claim'ą, bet be onboarding žymos
update public.profiles p set
  digital_onboarded_at = coalesce(p.digital_onboarded_at, c.claimed_at),
  active_deck_id = coalesce(p.active_deck_id, c.deck_id)
from (
  select distinct on (user_id) user_id, deck_id, claimed_at
  from public.user_starter_deck_claims order by user_id, claimed_at asc
) c
where c.user_id = p.id and p.digital_onboarded_at is null
returning p.id;
