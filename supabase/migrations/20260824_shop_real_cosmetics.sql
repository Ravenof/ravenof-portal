-- ════════════════════════════════════════════════════════════════════════════
--  PARDUOTUVĖ = TIKRA KOSMETIKA (feedback: „home kosmetika unrelated to shop").
--  1) Visos tikros perkamos kosmetikos (nugarėlės + avatarai su art/css) auto-
--     įtraukiamos į shop_items su silver kaina = cosmetics.price_gold.
--     Idempotentiška: slug = cosmetic id, on conflict do nothing.
--  2) Placeholder prekės BE JOKIO vizualo (basic/rare/premium/legendary_*)
--     išjungiamos iš parduotuvės (kosmetikos kataloge lieka, jei kas turi).
-- ════════════════════════════════════════════════════════════════════════════

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

-- placeholder prekės be vizualo — laukan iš parduotuvės
update public.shop_items si set is_active = false
where si.item_type in ('card_back','player_avatar')
  and exists (
    select 1 from public.cosmetics c
    where c.id = si.slug and c.image_url is null and c.css is null and c.emoji is null
  );
