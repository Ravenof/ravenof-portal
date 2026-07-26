-- ════════════════════════════════════════════════════════════════════════════
--  PARDUOTUVĖ — kiekinis pirkimas (×1 / ×5 / ×10)
--  ─────────────────────────────────────────────────────────────────────────
--  Boosterių pirkimas po vieną buvo varginantis. `rvn_purchase_shop_item_bulk`
--  nuperka N vienetų ATOMIŠKAI: viena balanso patikra bendrai sumai, N kartų
--  išduodamas payload, N eilučių user_shop_purchases, viena suminė
--  reward_transactions eilutė. Senasis rvn_purchase_shop_item NELIEČIAMAS
--  (klientas jį naudoja kaip fallback, kol ši migracija nepritaikyta).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_purchase_shop_item_bulk(
  p_item_id bigint, p_currency text, p_qty int default 1
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_it record; v_amt numeric; v_unit int; v_total int; v_bal int;
  v_qty int := greatest(1, least(coalesce(p_qty, 1), 10));   -- saugiklis: 1..10
  i int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if p_currency = 'real_money' then return jsonb_build_object('error','iap_required'); end if;

  select * into v_it from public.shop_items where id = p_item_id and is_active;
  if v_it is null then return jsonb_build_object('error','not_found'); end if;

  -- kiekinis pirkimas leidžiamas tik pasikartojančioms prekėms (pakuotės, rubinų rinkiniai);
  -- kosmetika/kaladės perkamos po vieną (kitaip žaidėjas mokėtų už dublikatus)
  if v_qty > 1 and v_it.item_type not in ('pack', 'rubies_bundle', 'bundle') then
    return jsonb_build_object('error','not_stackable');
  end if;

  select amount into v_amt from public.shop_item_prices
   where shop_item_id = p_item_id and currency_type = p_currency and is_active;
  if v_amt is null then return jsonb_build_object('error','no_price'); end if;
  v_unit := v_amt::int;
  v_total := v_unit * v_qty;

  if p_currency = 'silver' then
    select gold into v_bal from public.profiles where id = v_uid for update;
    if v_bal < v_total then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set gold = gold - v_total where id = v_uid;
  elsif p_currency = 'rubies' then
    select rubies into v_bal from public.profiles where id = v_uid for update;
    if v_bal < v_total then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set rubies = rubies - v_total where id = v_uid;
  else
    return jsonb_build_object('error','bad_currency');
  end if;

  for i in 1..v_qty loop
    perform public.rvn__grant_reward_payload(v_uid, v_it.payload, 'shop', v_it.slug);
    insert into public.user_shop_purchases(user_id, shop_item_id, currency_type, amount)
      values (v_uid, p_item_id, p_currency, v_unit);
  end loop;

  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
    values (v_uid, 'shop', v_it.slug, 'currency', p_currency, -v_total);

  return jsonb_build_object('ok', true, 'quantity', v_qty, 'spent', v_total,
    'balances', (select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence)
                   from public.profiles where id = v_uid));
end $$;

grant execute on function public.rvn_purchase_shop_item_bulk(bigint, text, int) to authenticated;
