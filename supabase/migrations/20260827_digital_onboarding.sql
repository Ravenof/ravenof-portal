-- ════════════════════════════════════════════════════════════════════════════
-- Digital onboarding v2: persistent onboarding būsena + aktyvi kaladė +
-- idempotentiškas starter claim + starter kaladės turinio RPC.
-- Idempotentiška — galima leisti pakartotinai.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) profiles: onboarding žyma + aktyvi kaladė
alter table public.profiles add column if not exists digital_onboarded_at timestamptz;
alter table public.profiles add column if not exists active_deck_id uuid;
do $$ begin
  alter table public.profiles
    add constraint profiles_active_deck_fk foreign key (active_deck_id)
    references public.decks(id) on delete set null;
exception when duplicate_object then null; end $$;

-- 2) Backfill: esami žaidėjai (turi starter claim ARBA bet kokią savo kaladę)
--    laikomi baigusiais onboarding — jų per srautą nebevaro.
update public.profiles p set digital_onboarded_at = now()
where p.digital_onboarded_at is null
  and ( exists (select 1 from public.user_starter_deck_claims c where c.user_id = p.id)
     or exists (select 1 from public.decks d where d.user_id = p.id) );

-- 3) Starter kaladės turinys (kortos su tipu/retumu/kaina) — onboarding peržiūrai
create or replace function public.rvn_get_starter_deck_cards(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object(
      'cardId', c.id, 'name', c.name, 'imageUrl', c.image_url,
      'gold', coalesce(c.gold_cost, 0), 'attack', c.attack, 'health', c.health,
      'effect', coalesce(nullif(c.effect_text, ''), c.description),
      'isChampion', coalesce(c.is_champion, false),
      'quantity', sdc.quantity,
      'type', ct.name,
      'rarity', r.name, 'raritySort', coalesce(r.sort_order, 0), 'rarityColor', r.color_hex
    ) order by coalesce(c.is_champion, false) desc, ct.name nulls last, coalesce(c.gold_cost, 0), c.name)
  into v_list
  from public.starter_deck_cards sdc
  join public.cards c on c.id = sdc.card_id
  left join public.card_types ct on ct.id = c.card_type_id
  left join public.rarities r on r.id = c.rarity_id
  where sdc.starter_deck_id = p_id;
  return jsonb_build_object('cards', coalesce(v_list, '[]'::jsonb));
end $$;
grant execute on function public.rvn_get_starter_deck_cards(uuid) to authenticated;

-- 4) rvn_claim_starter_deck v3 (bazė = 20260718 + 20260719):
--    IDEMPOTENTIŠKA (pakartotinis claim grąžina esamą deckId, ne klaidą),
--    pirmas claim: aktyvi kaladė + digital_onboarded_at.
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

  -- Onboarding: pirmas claim pažymi baigtą onboarding + aktyvią kaladę
  update public.profiles set
    digital_onboarded_at = coalesce(digital_onboarded_at, now()),
    active_deck_id = coalesce(active_deck_id, v_deck_id)
    where id = v_uid;

  return jsonb_build_object('ok', true, 'deckId', v_deck_id, 'free', v_first, 'alreadyClaimed', false);
end $$;
grant execute on function public.rvn_claim_starter_deck(uuid) to authenticated;
