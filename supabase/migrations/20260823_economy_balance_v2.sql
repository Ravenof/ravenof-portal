-- ════════════════════════════════════════════════════════════════════════════
--  EKONOMIKOS BALANSAS v2 (auditas 2026-07-07):
--  A) Kovos vertingesnės (login'as nebeuždirba daugiau nei žaidimas).
--  B) Craft pigesnis (legendinė 3200→2400, čempionas 4800→3600 esencijos).
--  C) Dienos deal brangesnis (epic 600→900, legendinė 1500→2600) — nebežudo craft.
--  D) Premium kosmetika TIK už rubinus (3 naujos prekės) + is_shop_exclusive.
--  + retro-sync: pre-Phase7 user_inventory kosmetika → user_cosmetics (saugus,
--  idempotentinis; pati grant funkcija iš 20260816 NELIEČIAMA).
-- ════════════════════════════════════════════════════════════════════════════

-- ── A) match_rewards ─────────────────────────────────────────────────────────
update public.economy_config set value = '{
  "bot":      {"win":{"silver":30,"season_xp":10,"account_xp":25},"loss":{"silver":8,"season_xp":5,"account_xp":10},"after_cap":{"silver_pct":0,"season_xp_pct":25,"account_xp_pct":25},"daily_cap":10},
  "unranked": {"win":{"silver":60,"season_xp":20,"account_xp":40},"loss":{"silver":15,"season_xp":10,"account_xp":20},"after_cap":{"silver_pct":0,"season_xp_pct":50,"account_xp_pct":50},"daily_cap":20},
  "ranked":   {"win":{"silver":80,"season_xp":30,"account_xp":60},"loss":{"silver":25,"season_xp":12,"account_xp":25},"ranked_step_win":1,"ranked_step_loss":-1}
}'::jsonb where key = 'match_rewards';

-- ── B) craft kainos ──────────────────────────────────────────────────────────
update public.economy_config set value = jsonb_set(jsonb_set(value,
  '{craft,5}', '2400'), '{craft,6}', '3600')
  where key = 'craft';

-- ── C) dienos deal kainos ────────────────────────────────────────────────────
create or replace function public.rvn__deal_price(p_sort int)
returns int language sql immutable as $$
  select case p_sort when 1 then 60 when 2 then 120 when 3 then 250 when 4 then 900 when 5 then 2600 else 100 end;
$$;

-- PASTABA: rvn__grant_reward_payload NELIEČIAMA — naujausia versija (20260816
-- Phase 7) jau tiltuoja card_back/player_avatar į user_cosmetics ir mapina
-- pakus į user_pack_inventory. Žemiau tik retro-sync seniems (pre-Phase7) įrašams.

-- retro-tiltas: jau nupirkti kosmetikos daiktai iš user_inventory → user_cosmetics
insert into public.user_cosmetics(user_id, cosmetic_id)
  select ui.user_id, ui.item_id from public.user_inventory ui
  where ui.item_type in ('card_back','board','player_avatar','avatar','cosmetic')
    and exists (select 1 from public.cosmetics c where c.id = ui.item_id)
  on conflict do nothing;

-- ── D) premium kosmetika TIK už rubinus ──────────────────────────────────────
alter table public.cosmetics add column if not exists is_shop_exclusive boolean not null default false;

insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order)
values
  ('cb_ruby_inferno', 'card_back', 'Rubino infernas', 'Išskirtinė nugarėlė — tik už rubinus', 0,
   'radial-gradient(120% 100% at 50% 0%, #7a1024 0%, #2a060d 55%, #0a0205 100%), linear-gradient(160deg,#3a0a14,#0a0205)', null, 300),
  ('cb_crimson_crown', 'card_back', 'Karmazino karūna', 'Išskirtinė nugarėlė — tik už rubinus', 0,
   'linear-gradient(160deg, #4a0d1f 0%, #1a0510 45%, #0a0208 100%)', null, 310),
  ('av_ruby_raven', 'avatar', 'Rubino varnas', 'Išskirtinis avataras — tik už rubinus', 0, null, '🐦‍⬛', 320)
on conflict (id) do update set is_shop_exclusive = true;
update public.cosmetics set is_shop_exclusive = true where id in ('cb_ruby_inferno','cb_crimson_crown','av_ruby_raven');

-- rvn_get_cosmetics: shop-exclusive rodomi tik jei TURIMI
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text; v_owned_arr text[];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(array_agg(cid),'{}') into v_owned_arr from (
    select cosmetic_id as cid from public.user_cosmetics where user_id=v_uid
    union
    select id from public.cosmetics where owned_by_default and is_active
  ) q;
  select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'description',description,
                                      'priceGold',price_gold,'css',css,'emoji',emoji,'imageUrl',image_url,
                                      'rarity',rarity,'ownedByDefault',owned_by_default,'videos',coalesce(videos,'[]'::jsonb),
                                      'portraitFit',portrait_fit) order by sort_order, name)
    into v_list from public.cosmetics
    where is_active and coalesce(status,'active')='active'
      and (not coalesce(is_shop_exclusive,false) or id = any(v_owned_arr));
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_owned from unnest(v_owned_arr) x;
  select equipped_card_back, equipped_board, equipped_avatar into v_cb, v_bd, v_av from public.profiles where id=v_uid;
  return jsonb_build_object('items', coalesce(v_list,'[]'::jsonb), 'owned', v_owned,
    'equippedCardBack', v_cb, 'equippedBoard', v_bd, 'equippedAvatar', v_av);
end $$;
grant execute on function public.rvn_get_cosmetics() to authenticated;

-- shop prekės (tik rubies kaina)
do $$
declare v_id bigint;
begin
  insert into public.shop_items(slug,item_type,name,description,rarity,payload,sort_order) values
   ('cb_ruby_inferno','card_back','Rubino infernas','Išskirtinė nugarėlė','legendary','[{"type":"item","item_type":"card_back","item_id":"cb_ruby_inferno","quantity":1}]',150)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'rubies',600) on conflict do nothing; end if;

  insert into public.shop_items(slug,item_type,name,description,rarity,payload,sort_order) values
   ('cb_crimson_crown','card_back','Karmazino karūna','Išskirtinė nugarėlė','epic','[{"type":"item","item_type":"card_back","item_id":"cb_crimson_crown","quantity":1}]',151)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'rubies',350) on conflict do nothing; end if;

  insert into public.shop_items(slug,item_type,name,description,rarity,payload,sort_order) values
   ('av_ruby_raven','player_avatar','Rubino varnas','Išskirtinis avataras','legendary','[{"type":"item","item_type":"player_avatar","item_id":"av_ruby_raven","quantity":1}]',152)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'rubies',800) on conflict do nothing; end if;
end $$;
