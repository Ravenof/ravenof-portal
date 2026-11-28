-- ════════════════════════════════════════════════════════════════════════════
-- PRESTIŽO NUGARĖLĖ (849) — atskira 50 paskyros lygio nugarėlė.
-- Iki šiol 50 lygio atlygis rodė į `prestige_card_back`, o tas ID nuo 816 yra
-- parduotuvės „Paauksuotos priesaikos nugarėlė". Čia:
--   1) sukuriama nauja kosmetika `cb_prestizas` (parduotuvėje NEPARDUODAMA);
--   2) 50 lygio atlygis perjungiamas į ją;
--   3) kas 50 lygio atlygį jau atsiėmė – gauna ir naująją (senoji lieka).
-- Failas: public/card-backs/v2/cb-prestizas.webp. Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default) values
  ('cb_prestizas', 'card_back', 'Prestižo nugarėlė', 'Baltas auksas ant juodo aksomo su rubinais ir varno plunksnomis. Tik pasiekusiems 50 paskyros lygį.', 0, null, null, 9, true, '/card-backs/v2/cb-prestizas.webp', 'legendary', 'active', false)
on conflict (id) do update
  set kind = 'card_back', name = excluded.name, description = excluded.description, price_gold = 0,
      sort_order = excluded.sort_order, is_active = true, image_url = excluded.image_url,
      rarity = excluded.rarity, status = 'active', owned_by_default = false;

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','cb_prestizas','en','name','Prestige card back'),
  ('cosmetic','cb_prestizas','en','description','White gold on black velvet with rubies and raven feathers. Only for those who reach account level 50.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

-- 2) 50 lygio atlygis → nauja nugarėlė
update public.economy_config
   set value = replace(value::text, '"cosmeticId": "prestige_card_back"', '"cosmeticId": "cb_prestizas"')::jsonb
 where key = 'account_level_rewards_v4'
   and value::text like '%"cosmeticId": "prestige_card_back"%';

-- 3) Jau atsiėmusiems 50 lygio atlygį
insert into public.user_cosmetics (user_id, cosmetic_id)
select c.user_id, 'cb_prestizas'
  from public.user_level_reward_claims c
 where c.level = 50 and c.reward_group = 'level_v3'
on conflict do nothing;

-- Patikra
do $$
declare v_cfg text; v_n int;
begin
  select (value->'levels'->'50')::text into v_cfg from public.economy_config where key = 'account_level_rewards_v4';
  select count(*) into v_n from public.user_cosmetics where cosmetic_id = 'cb_prestizas';
  if v_cfg is null or v_cfg not like '%cb_prestizas%' then
    raise exception 'PRESTIZO NUGARELE: 50 lygio atlygis neperjungtas (%).', v_cfg;
  end if;
  raise notice 'PRESTIZO NUGARELE: paruosta, 50 lygis = %, savininku %', v_cfg, v_n;
end $$;
