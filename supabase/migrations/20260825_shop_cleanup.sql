-- ════════════════════════════════════════════════════════════════════════════
--  SHOP VALYMAS (feedback): placeholder prekės LAUK, tikros prekės VIDUN.
--  1) 8 placeholder prekės (basic/rare/premium/legendary nugarėlės+avatarai)
--     deaktyvuojamos BESĄLYGIŠKAI — parduotuvėje lieka tik tikri daiktai.
--  2) Pakartotinis tikros kosmetikos sync (tas pats blokas kaip 20260824) —
--     pagauna ir kosmetiką, pridėtą PO ano paleidimo (admin'e pridėti daiktai).
--  Pastaba: 'Kaladės' (faction_deck/bundle) DB sekcija niekada neturėjo prekių —
--  UI ji pašalinta, Starter kaladės pervadintos į „Kaladės".
-- ════════════════════════════════════════════════════════════════════════════

-- 1) placeholder prekės lauk iš parduotuvės (kosmetikos kataloge lieka, jei kas turi)
update public.shop_items set is_active = false
where slug in (
  'basic_card_back','rare_card_back','premium_card_back','legendary_card_back',
  'basic_player_avatar','rare_player_avatar','premium_player_avatar','legendary_player_avatar'
);

-- 2) tikros kosmetikos sync (idempotentiškas; nauji admin daiktai atsiranda shope)
do $$
declare c record; v_id bigint; v_type text;
begin
  for c in
    select * from public.cosmetics
    where is_active and coalesce(status,'active') = 'active'
      and not owned_by_default
      and kind in ('card_back','avatar')
      and coalesce(price_gold, 0) > 0
      and not coalesce(is_shop_exclusive, false)
      and (image_url is not null or css is not null or emoji is not null)
      and id not in (
        'basic_card_back','rare_card_back','premium_card_back','legendary_card_back',
        'basic_player_avatar','rare_player_avatar','premium_player_avatar','legendary_player_avatar'
      )
  loop
    v_type := case when c.kind = 'avatar' then 'player_avatar' else 'card_back' end;
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values (c.id, v_type, c.name, c.description, c.rarity,
        jsonb_build_array(jsonb_build_object('type','item','item_type', v_type, 'item_id', c.id, 'quantity', 1)),
        200 + coalesce(c.sort_order, 0))
      on conflict (slug) do nothing
      returning id into v_id;
    if v_id is not null then
      insert into public.shop_item_prices(shop_item_id, currency_type, amount)
        values (v_id, 'silver', c.price_gold) on conflict do nothing;
    end if;
  end loop;
end $$;
