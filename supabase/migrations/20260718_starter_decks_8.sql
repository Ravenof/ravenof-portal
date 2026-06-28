-- ════════════════════════════════════════════════════════════════════════════
-- 8 frakcijų starter kaladės (shop + tutorial). Pakeičia auto-seedintas
-- atsitiktines ('Starter:%'). Kiekviena kaladė = tos frakcijos aktyvios kortos
-- (15 pigiausių ne-čempionų × 2 = 30). Pirma žaidėjo claim – NEMOKAMA (tutorialo
-- pasirinktas deck), likusios – už auksą (price_gold). Idempotentiška.
-- Frakcijos: 6 Mirties maršas, 7 Plėšikų naktis, 8 Vryhioko gauja, 9 Demonų orda,
-- 10 Inkvizicijos legionas, 11 Šviesos pulkas, 12 Mistikos melodija, 13 Rytų vėjas.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) pašalinam senas auto-seedintas (atsitiktines) starter kalades
delete from public.starter_decks where name like 'Starter:%';

-- 2) sukuriam 8 frakcijų starter kalades (jei dar nėra) + užpildom kortomis
do $$
declare
  v_price int := 1500;
  v_fac int; v_fname text; v_sid uuid; v_i int := 0;
  fr record;
begin
  for fr in
    select id, name from public.factions where id between 6 and 13 order by id
  loop
    v_i := v_i + 1;
    -- kaladė šiai frakcijai (pagal pavadinimą – idempotentiška)
    select id into v_sid from public.starter_decks where name = 'Ravenof startinė: ' || fr.name limit 1;
    if v_sid is null then
      insert into public.starter_decks (name, description, faction_id, price_gold, is_active, sort_order)
        values ('Ravenof startinė: ' || fr.name,
                'Pradžiamokslio kaladė – ' || fr.name || ' frakcija (30 kortų).',
                fr.id, v_price, true, v_i)
        returning id into v_sid;
    else
      update public.starter_decks set faction_id = fr.id, price_gold = v_price, is_active = true, sort_order = v_i
        where id = v_sid;
    end if;

    -- perkraunam kortas (švariai)
    delete from public.starter_deck_cards where starter_deck_id = v_sid;
    insert into public.starter_deck_cards (starter_deck_id, card_id, quantity)
    select v_sid, c.id, 2
    from public.cards c
    where c.status = 'active' and c.faction_id = fr.id and coalesce(c.is_champion, false) = false
    order by coalesce(c.gold_cost, 9999), c.name
    limit 15
    on conflict do nothing;
  end loop;
end $$;

-- 3) claim RPC: PIRMA žaidėjo starter kaladė – nemokama; likusios – už auksą
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

  -- kortos į kolekciją
  for r in select card_id, quantity from public.starter_deck_cards where starter_deck_id = p_id loop
    insert into public.user_collections (user_id, card_id, quantity)
      values (v_uid, r.card_id, r.quantity)
      on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + r.quantity;
  end loop;

  select coalesce(sum(sdc.quantity), 0),
         coalesce(round(sum(coalesce(c.gold_cost, 0) * sdc.quantity)::numeric / nullif(sum(sdc.quantity), 0), 2), 0)
    into v_count, v_avg
    from public.starter_deck_cards sdc join public.cards c on c.id = sdc.card_id
    where sdc.starter_deck_id = p_id;

  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
    values (v_uid, v_s.name, coalesce(v_s.description, 'Starter kaladė'), v_s.faction_id, 'private', v_count, v_avg)
    returning id into v_deck_id;

  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
    select v_deck_id, card_id, quantity, false from public.starter_deck_cards where starter_deck_id = p_id;

  insert into public.user_starter_deck_claims (user_id, starter_deck_id, deck_id)
    values (v_uid, p_id, v_deck_id);

  return jsonb_build_object('ok', true, 'deckId', v_deck_id, 'free', v_first);
end $$;

grant execute on function public.rvn_claim_starter_deck(uuid) to authenticated;

-- 4) rvn_get_starter_decks: pridedam factionId (reikia tutorial priešo frakcijai)
create or replace function public.rvn_get_starter_decks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name, 'description', s.description, 'imageUrl', s.image_url,
    'priceGold', s.price_gold, 'faction', f.name, 'factionId', s.faction_id,
    'cardCount', coalesce((select sum(quantity) from public.starter_deck_cards c where c.starter_deck_id = s.id), 0),
    'claimed', exists(select 1 from public.user_starter_deck_claims u where u.user_id = v_uid and u.starter_deck_id = s.id)
  ) order by s.sort_order, s.name)
  into v_list
  from public.starter_decks s
  left join public.factions f on f.id = s.faction_id
  where s.is_active;
  return jsonb_build_object('decks', coalesce(v_list, '[]'::jsonb));
end $$;
grant execute on function public.rvn_get_starter_decks() to authenticated;
