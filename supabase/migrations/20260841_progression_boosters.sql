-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — FRAKCIJOS BOOSTERIS + KORTOS PASIRINKIMAS
--  ─────────────────────────────────────────────────────────────────────────
--  • economy_config.booster_v2 — slotų taisyklės + rarity drop lentelė
--    (skaičiai PERKELTI iš gyvos rvn_open_pack_v3, 20260629_booster_rarity_v2.sql
--     — nauja ekonomika NEIŠGALVOTA)
--  • rvn__generate_faction_booster(user, faction) — 10 kortų viena transakcija
--  • rvn__build_card_choice_pool(user, rarity) — 1 Light + 1 Dark
--  • rvn_resolve_faction_booster_choice / rvn_resolve_card_choice
--  Esamas rvn_open_pack_v3 ir card_packs NELIEČIAMI.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.economy_config(key, value) values
('booster_v2', $j$
{
  "cards_total": 10,
  "faction_cards": 8,
  "universal_cards": 2,
  "universal_slot_pool": [1,2,3,4,5,6,7,8,9],
  "exclude_champions": true,
  "guaranteed_slot": {"index": 10, "min_rarity_sort": 3, "faction": "selected"},
  "slots": [
    {"from": 1, "to": 6,  "min_rarity_sort": 1, "weights": {"1":60,"2":30,"3":8,"4":1,"5":1}},
    {"from": 7, "to": 9,  "min_rarity_sort": 2, "weights": {"2":65,"3":25,"4":8,"5":2}},
    {"from": 10,"to": 10, "min_rarity_sort": 3, "weights": {"3":82,"4":15,"5":3}}
  ],
  "duplicate_protection_min_sort": 1
}
$j$::jsonb)
on conflict (key) do nothing;

insert into public.economy_config(key, value) values
('card_choice_v2', '{"exclude_champions":true,"options":2,"alignments":["light","dark"]}'::jsonb)
on conflict (key) do nothing;

-- ── Dublikato kompensacija (esencija) pagal rarity tier ────────────────────
create or replace function public.rvn__duplicate_essence(p_rarity_sort int)
returns int language sql stable set search_path = public as $$
  select coalesce(
    (select ((value->'disenchant')->>(p_rarity_sort::text))::int from public.economy_config where key='craft'),
    0)
$$;

-- ── Rarity pasirinkimas pagal svorius su minimaliu tieru ───────────────────
create or replace function public.rvn__roll_rarity_sort(p_weights jsonb, p_min_sort int)
returns int language plpgsql volatile set search_path = public as $$
declare k text; w int; v_total int := 0; v_roll int; v_acc int := 0; v_last int := p_min_sort;
begin
  for k, w in select key, value::text::int from jsonb_each(p_weights) loop
    if k::int >= p_min_sort then v_total := v_total + w; end if;
  end loop;
  if v_total <= 0 then return p_min_sort; end if;
  v_roll := floor(random() * v_total)::int + 1;
  for k, w in select key, value::text::int from jsonb_each(p_weights) order by key loop
    if k::int >= p_min_sort then
      v_acc := v_acc + w; v_last := k::int;
      if v_roll <= v_acc then return k::int; end if;
    end if;
  end loop;
  return v_last;
end $$;

-- ── Kortos parinkimas slotui (su duplicate protection) ─────────────────────
--  Grąžina cards.id arba null (jei visos tos rarity/frakcijos kortos jau capped)
create or replace function public.rvn__pick_booster_card(
  p_user uuid, p_faction_id int, p_rarity_sort int, p_exclude uuid[], p_exclude_champions boolean
) returns uuid language sql volatile set search_path = public as $$
  select c.id
  from public.cards c
  join public.rarities r on r.id = c.rarity_id
  left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
  where c.status = 'active'
    and c.faction_id = p_faction_id
    and r.sort_order = p_rarity_sort
    and (not p_exclude_champions or coalesce(c.is_champion,false) = false)
    and not (c.id = any(coalesce(p_exclude,'{}'::uuid[])))
    and coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)
  order by random()
  limit 1
$$;

-- ── FRAKCIJOS BOOSTERIS ────────────────────────────────────────────────────
--  8 pasirinktos frakcijos + 2 Universalus kortos; slotai 1–6 Common+,
--  7–9 Magic+, 10 garantuotai Rare+ IR pasirinktos frakcijos.
--  Viskas viena transakcija (funkcijos kūnas).
create or replace function public.rvn__generate_faction_booster(
  p_user uuid, p_faction_id int, p_source_type text, p_source_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb; v_total int; v_univ int; v_excl_champ boolean; v_ver int := public.rvn__economy_version();
  v_universal int; v_univ_slots int[]; v_slot int; v_sort int; v_faction int;
  v_card uuid; v_rule jsonb; v_weights jsonb; v_min int;
  v_drawn uuid[] := '{}'; v_cards jsonb := '[]'::jsonb; v_ess int; v_comp int := 0;
  v_rname text; v_code text;
begin
  if p_user is null then return jsonb_build_object('error','no_user'); end if;
  select id into v_universal from public.factions where slug = 'universalus';
  if v_universal is null then return jsonb_build_object('error','no_universal_faction'); end if;
  if not exists (select 1 from public.rvn__selectable_factions() f where f.id = p_faction_id) then
    return jsonb_build_object('error','faction_not_selectable');
  end if;

  select value into v_cfg from public.economy_config where key='booster_v2';
  v_total := coalesce((v_cfg->>'cards_total')::int, 10);
  v_univ  := coalesce((v_cfg->>'universal_cards')::int, 2);
  v_excl_champ := coalesce((v_cfg->>'exclude_champions')::boolean, true);

  -- 2 atsitiktiniai (bet ne garantuotasis) slotai atitenka Universalus kortoms
  select coalesce(array_agg(s order by s), '{}') into v_univ_slots
    from (select (jsonb_array_elements_text(v_cfg->'universal_slot_pool'))::int as s
          order by random() limit v_univ) q(s);

  for v_slot in 1..v_total loop
    -- slot taisyklė
    select r into v_rule from jsonb_array_elements(v_cfg->'slots') r
      where (r->>'from')::int <= v_slot and (r->>'to')::int >= v_slot limit 1;
    v_min := coalesce((v_rule->>'min_rarity_sort')::int, 1);
    v_weights := coalesce(v_rule->'weights', '{"1":100}'::jsonb);

    v_faction := case when v_slot = any(v_univ_slots) then v_universal else p_faction_id end;
    -- garantuotasis slotas visada pasirinktos frakcijos
    if v_slot = coalesce((v_cfg->'guaranteed_slot'->>'index')::int, v_total) then
      v_faction := p_faction_id;
      v_min := greatest(v_min, coalesce((v_cfg->'guaranteed_slot'->>'min_rarity_sort')::int, 3));
    end if;

    v_sort := public.rvn__roll_rarity_sort(v_weights, v_min);
    v_card := public.rvn__pick_booster_card(p_user, v_faction, v_sort, v_drawn, v_excl_champ);

    -- fallback: leidžiam žemesnį/aukštesnį tier'ą tos pačios frakcijos ribose
    if v_card is null then
      select c.id into v_card from public.cards c
        join public.rarities r on r.id = c.rarity_id
        left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
        where c.status='active' and c.faction_id = v_faction and r.sort_order >= v_min
          and (not v_excl_champ or coalesce(c.is_champion,false) = false)
          and not (c.id = any(v_drawn))
          and coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)
        order by random() limit 1;
      if v_card is not null then
        select r.sort_order into v_sort from public.cards c join public.rarities r on r.id=c.rarity_id where c.id=v_card;
      end if;
    end if;

    if v_card is null then
      -- visos tinkamos kortos jau pasiektos iki copy limit → esencijos kompensacija
      v_ess := public.rvn__duplicate_essence(v_sort);
      v_comp := v_comp + v_ess;
      v_cards := v_cards || jsonb_build_array(jsonb_build_object(
        'slot', v_slot, 'cardId', null, 'factionId', v_faction,
        'rarity', public.rvn__rarity_code_by_sort(v_sort),
        'compensated', true, 'essence', v_ess));
    else
      v_drawn := array_append(v_drawn, v_card);
      insert into public.user_collections(user_id, card_id, quantity) values (p_user, v_card, 1)
        on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1, updated_at = now();
      select c.name, r.sort_order into v_rname, v_sort
        from public.cards c join public.rarities r on r.id=c.rarity_id where c.id = v_card;
      v_code := public.rvn__rarity_code_by_sort(v_sort);
      insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, card_id, faction_id, economy_version, metadata)
        values (p_user, p_source_type, p_source_id, 'card', v_card, v_faction, v_ver,
                jsonb_build_object('slot', v_slot, 'rarity', v_code, 'booster', true));
      v_cards := v_cards || jsonb_build_array(jsonb_build_object(
        'slot', v_slot, 'cardId', v_card, 'name', v_rname, 'factionId', v_faction,
        'rarity', v_code, 'compensated', false));
    end if;
  end loop;

  if v_comp > 0 then
    update public.profiles set essence = essence + v_comp where id = p_user;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
      values (p_user, p_source_type, p_source_id, 'currency', 'essence', v_comp);
    insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, amount, economy_version)
      values (p_user, p_source_type, p_source_id, 'essence_compensation', v_comp, v_ver);
  end if;

  insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, faction_id, economy_version, metadata)
    values (p_user, p_source_type, p_source_id, 'faction_booster', p_faction_id, v_ver, jsonb_build_object('cards', v_cards));

  return jsonb_build_object('factionId', p_faction_id, 'cards', v_cards, 'essenceCompensation', v_comp);
end $$;

-- ── KORTOS PASIRINKIMO POOL (1 Light + 1 Dark) ─────────────────────────────
create or replace function public.rvn__card_choice_option(p_user uuid, p_card uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'cardId', c.id,
    'nameLt', c.name,
    'nameEn', coalesce(tr.name, c.name),
    'factionId', c.faction_id,
    'alignment', f.alignment,
    'rarity', public.rvn__rarity_code_by_sort(r.sort_order),
    'imageUrl', c.image_url,
    'effectTextLt', coalesce(c.effect_text, ''),
    'effectTextEn', coalesce(tr.effect_text, c.effect_text, ''),
    'goldCost', coalesce(c.gold_cost, 0),
    'ownedCount', coalesce(uc.quantity, 0),
    'copyLimit', coalesce(r.copy_limit, 2),
    'duplicateEssence', public.rvn__duplicate_essence(r.sort_order),
    'disabled', coalesce(uc.quantity,0) >= coalesce(r.copy_limit,2)
  )
  from public.cards c
  join public.rarities r on r.id = c.rarity_id
  join public.factions f on f.id = c.faction_id
  left join public.card_translations tr on tr.card_id = c.id and tr.locale = 'en' and tr.status = 'approved'
  left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
  where c.id = p_card
$$;

create or replace function public.rvn__build_card_choice_pool(p_user uuid, p_rarity_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_sort int := public.rvn__rarity_sort_by_code(p_rarity_code);
  v_excl boolean := coalesce((select (value->>'exclude_champions')::boolean from public.economy_config where key='card_choice_v2'), true);
  v_light uuid; v_dark uuid; v_out jsonb := '[]'::jsonb;
begin
  if v_sort is null then return '[]'::jsonb; end if;
  -- pirmenybė kortoms, kurių žaidėjas dar neturi iki copy limit
  select c.id into v_light from public.cards c
    join public.rarities r on r.id=c.rarity_id join public.factions f on f.id=c.faction_id
    left join public.user_collections uc on uc.card_id=c.id and uc.user_id=p_user
    where c.status='active' and r.sort_order=v_sort and f.alignment='light'
      and (not v_excl or coalesce(c.is_champion,false)=false)
    order by (coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)) desc, random() limit 1;
  select c.id into v_dark from public.cards c
    join public.rarities r on r.id=c.rarity_id join public.factions f on f.id=c.faction_id
    left join public.user_collections uc on uc.card_id=c.id and uc.user_id=p_user
    where c.status='active' and r.sort_order=v_sort and f.alignment='dark'
      and (not v_excl or coalesce(c.is_champion,false)=false)
    order by (coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)) desc, random() limit 1;

  if v_light is not null then v_out := v_out || jsonb_build_array(public.rvn__card_choice_option(p_user, v_light)); end if;
  if v_dark  is not null then v_out := v_out || jsonb_build_array(public.rvn__card_choice_option(p_user, v_dark));  end if;
  return v_out;
end $$;

-- ── PASIRINKIMŲ IŠSPRENDIMAS ───────────────────────────────────────────────
create or replace function public.rvn_resolve_faction_booster_choice(
  p_choice_id uuid, p_faction_id int, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_c public.reward_choices%rowtype; v_res jsonb; v_prev jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='resolve_faction_booster' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  select * into v_c from public.reward_choices
    where id = p_choice_id and user_id = v_uid for update;
  if v_c.id is null then return jsonb_build_object('error','choice_not_found'); end if;
  if v_c.status <> 'pending' then return jsonb_build_object('error','already_resolved'); end if;
  if v_c.choice_type <> 'faction_booster' then return jsonb_build_object('error','wrong_choice_type'); end if;
  if not exists (select 1 from public.rvn__selectable_factions() f where f.id = p_faction_id) then
    return jsonb_build_object('error','faction_not_selectable');
  end if;

  v_res := public.rvn__generate_faction_booster(v_uid, p_faction_id, v_c.source_type, v_c.source_id || ':choice:' || v_c.seq);
  update public.reward_choices set status='resolved', resolved_at=now(),
         resolution = jsonb_build_object('factionId', p_faction_id) || coalesce(v_res,'{}'::jsonb)
    where id = v_c.id;

  v_res := jsonb_build_object('status','completed','choiceId',v_c.id,'booster',v_res,
                              'pendingChoices', public.rvn__pending_choices(v_uid),
                              'balances', public.rvn__balances(v_uid));
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'resolve_faction_booster', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

create or replace function public.rvn_resolve_card_choice(
  p_choice_id uuid, p_card_id uuid, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_c public.reward_choices%rowtype; v_opt jsonb; v_res jsonb; v_prev jsonb;
  v_sort int; v_limit int; v_owned int; v_ess int; v_ver int := public.rvn__economy_version();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='resolve_card_choice' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  select * into v_c from public.reward_choices where id = p_choice_id and user_id = v_uid for update;
  if v_c.id is null then return jsonb_build_object('error','choice_not_found'); end if;
  if v_c.status <> 'pending' then return jsonb_build_object('error','already_resolved'); end if;
  if v_c.choice_type <> 'card' then return jsonb_build_object('error','wrong_choice_type'); end if;

  -- pasirinkimas privalo būti IŠ SERVERIO sukurto pool'o
  select o into v_opt from jsonb_array_elements(v_c.choice_pool) o where (o->>'cardId')::uuid = p_card_id limit 1;
  if v_opt is null then return jsonb_build_object('error','card_not_in_pool'); end if;

  select r.sort_order, coalesce(r.copy_limit,2) into v_sort, v_limit
    from public.cards c join public.rarities r on r.id=c.rarity_id where c.id = p_card_id;
  select coalesce(quantity,0) into v_owned from public.user_collections where user_id=v_uid and card_id=p_card_id;
  v_owned := coalesce(v_owned, 0);

  if v_owned >= v_limit then
    -- copy limit pasiektas → sukonfigūruota esencijos kompensacija
    v_ess := public.rvn__duplicate_essence(v_sort);
    update public.profiles set essence = essence + v_ess where id = v_uid;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
      values (v_uid, v_c.source_type, v_c.source_id, 'currency', 'essence', v_ess);
    insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, amount, card_id, economy_version)
      values (v_uid, v_c.source_type, v_c.source_id, 'essence_compensation', v_ess, p_card_id, v_ver);
    update public.reward_choices set status='resolved', resolved_at=now(),
      resolution = jsonb_build_object('cardId', p_card_id, 'compensated', true, 'essence', v_ess) where id = v_c.id;
    v_res := jsonb_build_object('status','completed','choiceId',v_c.id,'cardId',p_card_id,'compensated',true,'essence',v_ess);
  else
    insert into public.user_collections(user_id, card_id, quantity) values (v_uid, p_card_id, 1)
      on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1, updated_at = now();
    insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, card_id, economy_version, metadata)
      values (v_uid, v_c.source_type, v_c.source_id, 'card', p_card_id, v_ver,
              jsonb_build_object('rarity', v_c.rarity_code, 'fromChoice', true));
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
      values (v_uid, v_c.source_type, v_c.source_id, 'item', 'card', p_card_id::text, 1);
    update public.reward_choices set status='resolved', resolved_at=now(),
      resolution = jsonb_build_object('cardId', p_card_id, 'compensated', false) where id = v_c.id;
    v_res := jsonb_build_object('status','completed','choiceId',v_c.id,'cardId',p_card_id,'compensated',false);
  end if;

  v_res := v_res || jsonb_build_object('pendingChoices', public.rvn__pending_choices(v_uid),
                                       'balances', public.rvn__balances(v_uid));
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'resolve_card_choice', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Laukiančių pasirinkimų eilė klientui ───────────────────────────────────
create or replace function public.rvn_get_pending_choices()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  return jsonb_build_object('pendingChoices', public.rvn__pending_choices(v_uid),
                            'balances', public.rvn__balances(v_uid));
end $$;

grant execute on function public.rvn_resolve_faction_booster_choice(uuid, int, text) to authenticated;
grant execute on function public.rvn_resolve_card_choice(uuid, uuid, text) to authenticated;
grant execute on function public.rvn_get_pending_choices() to authenticated;
