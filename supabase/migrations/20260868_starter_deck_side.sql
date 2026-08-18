-- ════════════════════════════════════════════════════════════════════════════
--  Starter kaladės su Demonų prakeiksmų ŠONINE kalade (commit626).
--  1) starter_deck_cards.is_side_deck (default false — esamos kaladės nepakinta).
--  2) rvn_claim_starter_deck: kopijuoja is_side_deck į deck_cards; kaladės
--     statistika (card_count/avg) skaičiuojama TIK iš pagrindinių kortų.
--  Admin shop starter builder'is (commit626) rašo/skaito šį stulpelį;
--  žaidėjo /digital builder'is šoninę kaladę palaiko nuo commit533.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.starter_deck_cards
  add column if not exists is_side_deck boolean not null default false;

-- claim RPC (naujausia 20260718 versija + is_side_deck)
create or replace function public.rvn_claim_starter_deck(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_s public.starter_decks; v_gold int;
  v_count int; v_avg numeric; v_deck_id uuid; r record; v_first boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_s from public.starter_decks where id = p_id and is_active;
  if v_s.id is null then raise exception 'starter deck not found'; end if;
  if exists (select 1 from public.user_starter_deck_claims where user_id = v_uid and starter_deck_id = p_id) then
    raise exception 'already claimed';
  end if;

  v_first := not exists (select 1 from public.user_starter_deck_claims where user_id = v_uid);

  -- kaina TIK jei tai NE pirmoji kaladė
  if not v_first and v_s.price_gold > 0 then
    select gold into v_gold from public.profiles where id = v_uid;
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

  return jsonb_build_object('ok', true, 'deckId', v_deck_id, 'free', v_first);
end $$;

grant execute on function public.rvn_claim_starter_deck(uuid) to authenticated;
