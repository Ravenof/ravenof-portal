-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomika Phase 8 — Craft (dublikatai -> Esencija; kūrimas už Esenciją)
--  Reikšmės pagal rarities.sort_order (1=common..5=legendary, 6=champion).
--  Config-driven (economy_config.craft). max_copies riboja kūrimą + dulkinimą.
--  Idempotentiška per user_collections quantity; loguoja į reward_transactions.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.economy_config(key, value) values
('craft', $j$
{
  "disenchant": {"1":10, "2":25, "3":75, "4":250, "5":800, "6":1200},
  "craft":      {"1":40, "2":100,"3":300,"4":1000,"5":3200,"6":4800},
  "max_copies": {"1":3, "2":3, "3":3, "4":2, "5":1, "6":1}
}
$j$::jsonb)
on conflict (key) do nothing;

-- kortos rarity sort_order (champion tipas -> 6, kad būtų brangesnis)
create or replace function public.rvn__card_rarity_tier(p_card_id uuid)
returns int language sql stable as $$
  select case when ct.name ilike '%champion%' or ct.name ilike '%čempion%' then 6
              else coalesce(r.sort_order, 1) end
  from public.cards c
  left join public.rarities r on r.id = c.rarity_id
  left join public.card_types ct on ct.id = c.card_type_id
  where c.id = p_card_id
$$;

-- kortos leidžiamas kopijų kiekis (rarities.copy_limit, tikroji deck riba)
create or replace function public.rvn__card_copy_limit(p_card_id uuid)
returns int language sql stable as $$
  select coalesce(r.copy_limit, 2) from public.cards c
  left join public.rarities r on r.id = c.rarity_id where c.id = p_card_id
$$;

-- ── būsena (config + esencija) ──────────────────────────────────────────────
create or replace function public.rvn_get_craft_config()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cfg jsonb;
begin
  select value into v_cfg from public.economy_config where key='craft';
  return jsonb_build_object('config', coalesce(v_cfg,'{}'::jsonb),
    'essence', coalesce((select essence from public.profiles where id=v_uid),0));
end $$;

-- ── disenchant (dulkinti dublikatus -> esencija) ────────────────────────────
create or replace function public.rvn_disenchant_card(p_card_id uuid, p_count int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cfg jsonb; v_tier int; v_qty int; v_maxc int; v_excess int; v_val int; v_gain int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if coalesce(p_count,0) <= 0 then return jsonb_build_object('error','bad_count'); end if;
  select value into v_cfg from public.economy_config where key='craft';
  v_tier := public.rvn__card_rarity_tier(p_card_id);
  select quantity into v_qty from public.user_collections where user_id=v_uid and card_id=p_card_id;
  if coalesce(v_qty,0) <= 0 then return jsonb_build_object('error','not_owned'); end if;
  v_maxc := public.rvn__card_copy_limit(p_card_id);
  v_excess := v_qty - v_maxc;                          -- tik dublikatus virš playset'o
  if v_excess < p_count then return jsonb_build_object('error','no_duplicates', 'excess', greatest(0,v_excess)); end if;
  v_val := coalesce((v_cfg->'disenchant'->>v_tier::text)::int, 10);
  v_gain := v_val * p_count;

  update public.user_collections set quantity = quantity - p_count where user_id=v_uid and card_id=p_card_id;
  update public.profiles set essence = essence + v_gain where id=v_uid;
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount, item_type, item_id, quantity)
    values (v_uid, 'craft_disenchant', p_card_id::text, 'currency', 'essence', v_gain, 'card', p_card_id::text, -p_count);
  return jsonb_build_object('ok',true,'essenceGained',v_gain,
    'essence',(select essence from public.profiles where id=v_uid));
end $$;

-- ── craft (sukurti kortą už esenciją) ───────────────────────────────────────
create or replace function public.rvn_craft_card(p_card_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cfg jsonb; v_tier int; v_cost int; v_ess int; v_qty int; v_maxc int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if not exists (select 1 from public.cards where id=p_card_id and status='active') then return jsonb_build_object('error','not_found'); end if;
  select value into v_cfg from public.economy_config where key='craft';
  v_tier := public.rvn__card_rarity_tier(p_card_id);
  v_cost := coalesce((v_cfg->'craft'->>v_tier::text)::int, 40);
  v_maxc := public.rvn__card_copy_limit(p_card_id);
  select coalesce(quantity,0) into v_qty from public.user_collections where user_id=v_uid and card_id=p_card_id;
  if coalesce(v_qty,0) >= v_maxc then return jsonb_build_object('error','max_copies'); end if;
  select essence into v_ess from public.profiles where id=v_uid;
  if v_ess < v_cost then return jsonb_build_object('error','not_enough_essence','cost',v_cost); end if;

  update public.profiles set essence = essence - v_cost where id=v_uid;
  insert into public.user_collections(user_id, card_id, quantity) values (v_uid, p_card_id, 1)
    on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1;
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount, item_type, item_id, quantity)
    values (v_uid, 'craft_create', p_card_id::text, 'currency', 'essence', -v_cost, 'card', p_card_id::text, 1);
  return jsonb_build_object('ok',true,'cost',v_cost,
    'essence',(select essence from public.profiles where id=v_uid));
end $$;

grant execute on function public.rvn_get_craft_config() to authenticated;
grant execute on function public.rvn_disenchant_card(uuid, int) to authenticated;
grant execute on function public.rvn_craft_card(uuid) to authenticated;
