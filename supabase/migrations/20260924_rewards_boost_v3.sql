-- ════════════════════════════════════════════════════════════════════════════
--  ATLYGIŲ KĖLIMAS v3 (2026-09-20, patvirtinta Donato)
--  ─────────────────────────────────────────────────────────────────────────
--  Po kovų atlygio kėlimo (20260923) dienos užduotys, skrynia ir mėnesio
--  login atsiliko. Šis paketas:
--   1) match_rewards: ranked pergalė 80 → 100 sidabro
--   2) daily_quests_v2: 150 / 275 / 450 sid. + skrynia 700 sid. + 2 RUBINAI
--   3) login_cycle_reward_defs: nauja versija 3 (31 d., ~×2 sidabro, 75 rub.)
--      + progression_economy_version = 3
--   4) season_path_v2: xp_per_level 1000 → 1500 (20 lvl = 30 000 XP)
--      + esamo user_season_pass.xp perskaičiavimas ×1.5, kad niekam
--        nenukristų sezono lygis
--   5) boosterio kaina 200/250 → 600 sidabro (+ shop_item_prices sinchr.)
--
--  Idempotentiška. Vienkartiniai veiksmai (XP perskaičiavimas, pakų kainos)
--  apsaugoti economy_config.rewards_v3_applied žyma.
--  Progresijos v1 (daily_tasks, monthly_login) NELIEČIAMA.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Ranked pergalė: 80 → 100 sidabro ─────────────────────────────────────
update public.economy_config
   set value = jsonb_set(value, '{ranked,win,silver}', '100'::jsonb, true),
       updated_at = now()
 where key = 'match_rewards';

-- ── 2) Dienos užduotys + skrynia ────────────────────────────────────────────
--  lengva 150 · vidutinė 275 (+20 es.) · sunki 450 (+40 es.) · SKRYNIA 700 (+100 es. + 2 rub.)
--  Sezono XP: 100 / 150 / 200 / 250 (viso 700 per parą)
--  Reroll: 1 nemokamas + 2 po 150 sid.
--  PASTABA: `generation` blokas NELIEČIAMAS (20260848 įjungė enable_stat_objectives).
--  PASTABA: užduočių atlygiai užšaldomi generavimo metu → naujos sumos nuo kitos UTC paros;
--           skrynia skaitoma iš config'o claim metu → veikia iškart.
update public.economy_config
   set value = jsonb_set(jsonb_set(jsonb_set(jsonb_set(value,
         '{rewards}', $j${
           "easy":   [{"type":"silver","amount":150}, {"type":"season_xp","amount":100}],
           "medium": [{"type":"silver","amount":275}, {"type":"essence","amount":20}, {"type":"season_xp","amount":150}],
           "hard":   [{"type":"silver","amount":450}, {"type":"essence","amount":40}, {"type":"season_xp","amount":200}]
         }$j$::jsonb, true),
         '{chest}', $j$[
           {"type":"silver","amount":700},
           {"type":"essence","amount":100},
           {"type":"rubies","amount":2},
           {"type":"season_xp","amount":250}
         ]$j$::jsonb, true),
         '{daily_max}', '{"silver":1575,"essence":160,"rubies":2,"season_xp":700}'::jsonb, true),
         '{reroll,paid_cost_silver}', '150'::jsonb, true),
       updated_at = now()
 where key = 'daily_quests_v2';

-- ── 3) Mėnesio login — atlygių lentelė v3 ───────────────────────────────────
--  Kreivė kyla monotoniškai: sidabras 200 → 1500, esencija 50 → 300.
--  Milestone'ai: 7 (boosteris) · 14 (boosteris + 10 rub.) · 21 (korta) ·
--                28 (boosteris + 15 rub.) · 30 (25 rub.) · 31 (finalas + 25 rub.)
--  Viso per mėnesį: 12 700 sid. · 1 650 esenc. · 75 rub. · 5 boosteriai · 1 korta.
--  Jau prasidėję ciklai lieka su v2 lentele (login_cycle_reward_defs versionuota).
insert into public.login_cycle_reward_defs(economy_version, day_number, rewards, is_milestone) values
 (3, 1,  '[{"type":"silver","amount":200}]', false),
 (3, 2,  '[{"type":"essence","amount":50}]', false),
 (3, 3,  '[{"type":"silver","amount":250}]', false),
 (3, 4,  '[{"type":"silver","amount":300}]', false),
 (3, 5,  '[{"type":"essence","amount":75}]', false),
 (3, 6,  '[{"type":"silver","amount":350}]', false),
 (3, 7,  '[{"type":"faction_booster_choice","quantity":1},{"type":"silver","amount":200}]', true),
 (3, 8,  '[{"type":"silver","amount":400}]', false),
 (3, 9,  '[{"type":"essence","amount":100}]', false),
 (3, 10, '[{"type":"silver","amount":450}]', false),
 (3, 11, '[{"type":"silver","amount":500}]', false),
 (3, 12, '[{"type":"essence","amount":125}]', false),
 (3, 13, '[{"type":"silver","amount":550}]', false),
 (3, 14, '[{"type":"faction_booster_choice","quantity":1},{"type":"rubies","amount":10}]', true),
 (3, 15, '[{"type":"silver","amount":600}]', false),
 (3, 16, '[{"type":"essence","amount":150}]', false),
 (3, 17, '[{"type":"silver","amount":650}]', false),
 (3, 18, '[{"type":"essence","amount":175}]', false),
 (3, 19, '[{"type":"silver","amount":700}]', false),
 (3, 20, '[{"type":"silver","amount":800}]', false),
 (3, 21, '[{"type":"card_choice","rarity":"rare"},{"type":"silver","amount":300}]', true),
 (3, 22, '[{"type":"silver","amount":850}]', false),
 (3, 23, '[{"type":"essence","amount":200}]', false),
 (3, 24, '[{"type":"silver","amount":900}]', false),
 (3, 25, '[{"type":"essence","amount":225}]', false),
 (3, 26, '[{"type":"silver","amount":1000}]', false),
 (3, 27, '[{"type":"silver","amount":1200}]', false),
 (3, 28, '[{"type":"faction_booster_choice","quantity":1},{"type":"essence","amount":250},{"type":"rubies","amount":15}]', true),
 (3, 29, '[{"type":"silver","amount":1500}]', false),
 (3, 30, '[{"type":"rubies","amount":25},{"type":"silver","amount":500}]', true),
 (3, 31, '[{"type":"faction_booster_choice","quantity":2},{"type":"silver","amount":2000},{"type":"essence","amount":300},{"type":"rubies","amount":25}]', true)
on conflict (economy_version, day_number) do update
  set rewards = excluded.rewards, is_milestone = excluded.is_milestone, updated_at = now();

-- ekonomikos versija → 3 (nauji login ciklai, nauji sezonai, nauji questai)
insert into public.economy_config(key, value) values ('progression_economy_version', '{"version":3}'::jsonb)
on conflict (key) do update set value = '{"version":3}'::jsonb, updated_at = now();

-- ── 4) Sezono takas: 1000 → 1500 XP už lygį ─────────────────────────────────
update public.economy_config
   set value = jsonb_set(jsonb_set(value, '{xp_per_level}', '1500'::jsonb, true),
                         '{total_xp}', '30000'::jsonb, true),
       updated_at = now()
 where key = 'season_path_v2';

-- ── 5) + 4b) VIENKARTINIAI veiksmai (apsaugoti žyma) ────────────────────────
do $$
declare v_packs int := 0; v_users int := 0;
begin
  if exists (select 1 from public.economy_config where key = 'rewards_v3_applied') then
    raise notice 'rewards_v3 jau pritaikyta – vienkartiniai veiksmai praleidžiami';
    return;
  end if;

  -- 4b) sezono XP ×1.5, kad pakeitus xp_per_level niekam nenukristų lygis
  update public.user_season_pass set xp = ceil(xp * 1.5)::int where coalesce(xp, 0) > 0;
  get diagnostics v_users = row_count;

  -- 5) boosterio kaina: bazinis 600; brangesni (admin sukurti) skaluojami ×2.4, apvalinant iki 50
  update public.card_packs
     set price_gold = greatest(600, (ceil(price_gold * 2.4 / 50.0) * 50)::int)
   where coalesce(price_gold, 0) > 0;
  get diagnostics v_packs = row_count;

  -- parduotuvės sidabro kainos pakams = card_packs.price_gold
  update public.shop_item_prices p
     set amount = cp.price_gold
    from public.shop_items s
    join public.card_packs cp on s.slug = 'cardpack_' || cp.id::text
   where p.shop_item_id = s.id
     and p.currency_type = 'silver'
     and s.item_type = 'pack';

  insert into public.economy_config(key, value)
    values ('rewards_v3_applied', jsonb_build_object('at', now(), 'packs', v_packs, 'season_xp_rescaled', v_users));

  raise notice 'rewards_v3: pakų kainų atnaujinta %, sezono XP perskaičiuota % žaidėjams', v_packs, v_users;
end $$;
