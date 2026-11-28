-- ═══════════════════════════════════════════════════════════════════════════
--  PASKYROS LYGIS 1–50 · PERTVARKA v4 (kreivė, atlygiai, prestižo ratas, XP šaltiniai, atrakinimai)
--  Planas: „Ravenof – paskyros lygių pertvarka" (2026-11-28, Donato sprendimai).
--  ─────────────────────────────────────────────────────────────────────────
--  Kas keičiasi:
--   1) XP KREIVĖ. Lygio kaina = 50 + 30n + 1,5n² (suapvalinta iki 10), visada
--      didėja; suma 99800 XP. Visi nauji slenksčiai ≤ senų, tad niekas lygio
--      nepraranda (dauguma pakyla). VEIDRODIS: src/lib/gamification/levels.ts.
--   2) ATLYGIAI. Nauja lentelė `account_level_rewards_v4`: 10 pakopų po 5 lygius,
--      eilinių lygių ritmas sidabras → boosteris → esencija → boosteris, etapai
--      kas 5 lygius. Senų nugarėlių (10/20/30/40 lygiai) nebėra.
--   3) PRESTIŽO RATAS. Po 50 lygio kas `prestige.everyXp` XP – `prestige.rewards`.
--   4) PERŠOKTI LYGIAI. Žaidėjams, kurių lygis pakilo dėl naujos kreivės,
--      naujai pasiektų lygių atlygiai IŠDUODAMI (Donato sprendimas). Jau atsiimti
--      lygiai (grupė 'level_v3') antrą kartą neišduodami.
--  Bazė: vėliausi apibrėžimai – rvn__level_from_xp (20260804), rvn__xp_for_level
--  ir rvn__check_level_rewards (20260852), rvn_get_account_level (20260854).
--  Iškvietimo taškai nesikeičia. Idempotentiška.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) XP slenksčiai (abi funkcijos naudoja TĄ PATĮ masyvą) ────────────────
create or replace function public.rvn__xp_for_level(p_level int)
returns bigint language plpgsql immutable as $$
declare
  t bigint[] := array[0,80,200,350,540,780,1060,1390,1780,2220,2720,3280,3910,4600,5360,
    6200,7110,8100,9180,10340,11590,12930,14370,15900,17530,19270,21110,23060,25130,27310,
    29610,32030,34580,37250,40050,42990,46060,49270,52630,56130,59780,63580,67540,71650,75920,
    80360,84960,89730,94680,99800];
begin
  if p_level < 1 then return 0; end if;
  if p_level > 50 then return t[50]; end if;
  return t[p_level];
end $$;
grant execute on function public.rvn__xp_for_level(int) to authenticated;

create or replace function public.rvn__level_from_xp(p_xp bigint)
returns int language plpgsql immutable as $$
declare
  t bigint[] := array[0,80,200,350,540,780,1060,1390,1780,2220,2720,3280,3910,4600,5360,
    6200,7110,8100,9180,10340,11590,12930,14370,15900,17530,19270,21110,23060,25130,27310,
    29610,32030,34580,37250,40050,42990,46060,49270,52630,56130,59780,63580,67540,71650,75920,
    80360,84960,89730,94680,99800];
  i int;
begin
  for i in reverse 50..1 loop
    if p_xp >= t[i] then return i; end if;
  end loop;
  return 1;
end $$;

-- ── 2) Atlygių lentelė v4 (serveris = tiesos šaltinis; keičiama admin ekonomikoje) ──
insert into public.economy_config (key, value) values ('account_level_rewards_v4', $j$
{
 "milestoneLevels": [
  5,
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50
 ],
 "tiers": [
  {
   "key": "novice",
   "from": 1,
   "to": 4
  },
  {
   "key": "player",
   "from": 5,
   "to": 9
  },
  {
   "key": "tactician",
   "from": 10,
   "to": 14
  },
  {
   "key": "seasoned",
   "from": 15,
   "to": 19
  },
  {
   "key": "veteran",
   "from": 20,
   "to": 24
  },
  {
   "key": "master",
   "from": 25,
   "to": 29
  },
  {
   "key": "highMaster",
   "from": 30,
   "to": 34
  },
  {
   "key": "legend",
   "from": 35,
   "to": 39
  },
  {
   "key": "elite",
   "from": 40,
   "to": 44
  },
  {
   "key": "pantheon",
   "from": 45,
   "to": 49
  },
  {
   "key": "prestige",
   "from": 50,
   "to": 50
  }
 ],
 "prestige": {
  "everyXp": 5000,
  "rewards": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ]
 },
 "levels": {
  "2": [
   {
    "type": "silver",
    "amount": 600
   }
  ],
  "3": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "4": [
   {
    "type": "essence",
    "amount": 200
   }
  ],
  "5": [
   {
    "type": "card_choice",
    "rarity": "rare"
   }
  ],
  "6": [
   {
    "type": "silver",
    "amount": 800
   }
  ],
  "7": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "8": [
   {
    "type": "essence",
    "amount": 250
   }
  ],
  "9": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "10": [
   {
    "type": "rubies",
    "amount": 50
   }
  ],
  "11": [
   {
    "type": "silver",
    "amount": 1000
   }
  ],
  "12": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "13": [
   {
    "type": "essence",
    "amount": 300
   }
  ],
  "14": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "15": [
   {
    "type": "card_choice",
    "rarity": "rare"
   }
  ],
  "16": [
   {
    "type": "silver",
    "amount": 1300
   }
  ],
  "17": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "18": [
   {
    "type": "essence",
    "amount": 400
   }
  ],
  "19": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "20": [
   {
    "type": "rubies",
    "amount": 75
   }
  ],
  "21": [
   {
    "type": "silver",
    "amount": 1500
   }
  ],
  "22": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "23": [
   {
    "type": "essence",
    "amount": 450
   }
  ],
  "24": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "25": [
   {
    "type": "card_choice",
    "rarity": "epic"
   }
  ],
  "26": [
   {
    "type": "silver",
    "amount": 1800
   }
  ],
  "27": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "28": [
   {
    "type": "essence",
    "amount": 500
   }
  ],
  "29": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "30": [
   {
    "type": "rubies",
    "amount": 100
   }
  ],
  "31": [
   {
    "type": "silver",
    "amount": 2000
   }
  ],
  "32": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "33": [
   {
    "type": "essence",
    "amount": 600
   }
  ],
  "34": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "35": [
   {
    "type": "faction_booster_choice",
    "quantity": 2
   }
  ],
  "36": [
   {
    "type": "silver",
    "amount": 2300
   }
  ],
  "37": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "38": [
   {
    "type": "essence",
    "amount": 700
   }
  ],
  "39": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "40": [
   {
    "type": "rubies",
    "amount": 125
   }
  ],
  "41": [
   {
    "type": "silver",
    "amount": 2500
   }
  ],
  "42": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "43": [
   {
    "type": "essence",
    "amount": 750
   }
  ],
  "44": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "45": [
   {
    "type": "card_choice",
    "rarity": "epic"
   }
  ],
  "46": [
   {
    "type": "silver",
    "amount": 3000
   }
  ],
  "47": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "48": [
   {
    "type": "essence",
    "amount": 850
   }
  ],
  "49": [
   {
    "type": "faction_booster_choice",
    "quantity": 1
   }
  ],
  "50": [
   {
    "type": "card_choice",
    "rarity": "legendary"
   },
   {
    "type": "rubies",
    "amount": 200
   },
   {
    "type": "card_back",
    "cosmeticId": "prestige_card_back"
   }
  ]
 }
}
$j$::jsonb)
on conflict (key) do nothing;

create or replace function public.rvn__account_level_payload_v4(p_level int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(
    (select value->'levels'->(p_level::text) from public.economy_config where key = 'account_level_rewards_v4'),
    '[]'::jsonb)
$$;
grant execute on function public.rvn__account_level_payload_v4(int) to authenticated;

-- ── 3) Lygio patikra: v4 atlygiai + prestižo ratas ─────────────────────────
--  Lygių 2..50 claim'ai lieka grupėje 'level_v3' – taip jau atsiimti lygiai
--  nebeišduodami. Prestižo ratai: level = 50 + rato numeris, grupė 'prestige_v4'.
create or replace function public.rvn__check_level_rewards(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_xp bigint; v_lvl int; L int; v_ins int; v_pay jsonb; v_res jsonb; v_out jsonb := '[]'::jsonb;
  v_pre jsonb; v_every bigint; v_loops int; k int;
begin
  if p_user is null then return '[]'::jsonb; end if;
  select coalesce(xp_total,0) into v_xp from public.profiles where id = p_user;
  if v_xp is null then return '[]'::jsonb; end if;
  v_lvl := public.rvn__level_from_xp(v_xp);
  if v_lvl < 2 then return '[]'::jsonb; end if;
  for L in 2..v_lvl loop
    insert into public.user_level_reward_claims(user_id, level, reward_group)
      values (p_user, L, 'level_v3') on conflict do nothing;
    get diagnostics v_ins = row_count;
    if v_ins > 0 then
      v_pay := public.rvn__account_level_payload_v4(L);
      if jsonb_array_length(v_pay) > 0 then
        v_res := public.rvn__grant_rewards_v2(p_user, v_pay, 'level', 'level:' || L::text);
        v_out := v_out || jsonb_build_array(jsonb_build_object(
          'level', L,
          'payload', public.rvn__granted_to_legacy(v_res->'granted'),
          'rewards', v_pay,
          'granted', v_res->'granted',
          'pendingChoices', v_res->'pendingChoices'));
      end if;
    end if;
  end loop;

  -- prestižo ratas (tik pasiekus 50 lygį)
  if v_lvl >= 50 then
    select value->'prestige' into v_pre from public.economy_config where key = 'account_level_rewards_v4';
    v_every := coalesce((v_pre->>'everyXp')::bigint, 0);
    v_pay := coalesce(v_pre->'rewards', '[]'::jsonb);
    if v_every > 0 and jsonb_array_length(v_pay) > 0 then
      -- saugiklis: per vieną kvietimą ne daugiau kaip 50 ratų
      v_loops := least(50, ((v_xp - public.rvn__xp_for_level(50)) / v_every)::int);
      for k in 1..v_loops loop
        insert into public.user_level_reward_claims(user_id, level, reward_group)
          values (p_user, 50 + k, 'prestige_v4') on conflict do nothing;
        get diagnostics v_ins = row_count;
        if v_ins > 0 then
          v_res := public.rvn__grant_rewards_v2(p_user, v_pay, 'level', 'prestige:' || k::text);
          v_out := v_out || jsonb_build_array(jsonb_build_object(
            'level', 50, 'prestige', k,
            'payload', public.rvn__granted_to_legacy(v_res->'granted'),
            'rewards', v_pay,
            'granted', v_res->'granted',
            'pendingChoices', v_res->'pendingChoices'));
        end if;
      end loop;
    end if;
  end if;
  return v_out;
end $$;
grant execute on function public.rvn__check_level_rewards(uuid) to authenticated;

-- ── 4) Ekrano duomenys: v4 atlygiai, pakopos, prestižo ratas ───────────────
create or replace function public.rvn_get_account_level(p_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_self boolean := (p_user_id is null or p_user_id = auth.uid());
  v_xp bigint; v_lvl int; v_cur bigint; v_next bigint; v_track jsonb; v_cfg jsonb; v_ms jsonb;
  v_every bigint; v_over bigint; v_prestige jsonb := null;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select coalesce(xp_total,0) into v_xp from public.profiles where id = v_uid;
  if v_xp is null then return jsonb_build_object('error','no_profile'); end if;

  v_lvl  := public.rvn__level_from_xp(v_xp);
  v_cur  := public.rvn__xp_for_level(v_lvl);
  v_next := case when v_lvl >= 50 then null else public.rvn__xp_for_level(v_lvl + 1) end;
  select value into v_cfg from public.economy_config where key = 'account_level_rewards_v4';
  v_ms := v_cfg->'milestoneLevels';

  select jsonb_agg(jsonb_build_object(
      'level', L,
      'xpRequired', public.rvn__xp_for_level(L),
      'rewards', public.rvn__account_level_payload_v4(L),
      'milestone', coalesce(v_ms @> to_jsonb(L), false),
      'state', case
        when L <= v_lvl and exists (
          select 1 from public.reward_choices rc
           where rc.user_id = v_uid and rc.source_type = 'level'
             and rc.source_id = 'level:' || L::text and rc.status = 'pending') then 'pending'
        when L <= v_lvl then 'claimed'
        when L = v_lvl + 1 then 'next'
        else 'future' end
    ) order by L)
    into v_track
    from generate_series(1, 50) as gs(L);

  v_every := coalesce((v_cfg->'prestige'->>'everyXp')::bigint, 0);
  if v_every > 0 then
    v_over := greatest(0, v_xp - public.rvn__xp_for_level(50));
    v_prestige := jsonb_build_object(
      'everyXp', v_every,
      'rewards', coalesce(v_cfg->'prestige'->'rewards', '[]'::jsonb),
      'active', v_lvl >= 50,
      'loops', case when v_lvl >= 50 then (v_over / v_every)::int else 0 end,
      'xpIntoLoop', case when v_lvl >= 50 then (v_over % v_every) else 0 end);
  end if;

  return jsonb_build_object(
    'level', v_lvl,
    'maxLevel', 50,
    'totalXp', v_xp,
    'currentLevelXp', v_cur,
    'nextLevelXp', v_next,
    'xpIntoLevel', v_xp - v_cur,
    'xpForNextLevel', case when v_next is null then 0 else v_next - v_cur end,
    'isMaxLevel', v_lvl >= 50,
    'track', coalesce(v_track, '[]'::jsonb),
    'tiers', coalesce(v_cfg->'tiers', '[]'::jsonb),
    'prestige', v_prestige,
    'unlocks', (select value->'features' from public.economy_config where key = 'account_level_unlocks_v1'),
    'xpSources', (select value from public.economy_config where key = 'account_xp_sources'),
    'matchXp', (select jsonb_object_agg(mr.key, jsonb_build_object(
                    'win',  coalesce((mr.value->'win'->>'account_xp')::int, 0),
                    'loss', coalesce((mr.value->'loss'->>'account_xp')::int, 0)))
                  from public.economy_config ec, jsonb_each(ec.value) mr
                 where ec.key = 'match_rewards' and mr.key in ('bot','unranked','ranked')
                   and jsonb_typeof(mr.value) = 'object'),
    'firstWinAvailable', not exists (
      select 1 from public.matches mm
       where mm.user_id = v_uid and mm.result = 'win' and mm.valid_for_rewards
         and mm.created_at >= date_trunc('day', now())),
    'pendingChoices', case when v_self then public.rvn__pending_choices(v_uid) else '[]'::jsonb end,
    'balances', case when v_self then public.rvn__balances(v_uid) else '{}'::jsonb end
  );
end $$;
grant execute on function public.rvn_get_account_level(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  2 ETAPAS: XP šaltiniai ir režimų atrakinimas pagal lygį
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 7) Konfigūracija ───────────────────────────────────────────────────────
--  account_xp_sources: papildomi paskyros XP šaltiniai (kovų XP lieka match_rewards).
--  account_level_unlocks_v1: nuo kurio lygio kas atrakinama. `grandfatherBefore` –
--  paskyros, sukurtos iki šios migracijos, NIEKO nepraranda (viskas atvira).
insert into public.economy_config (key, value) values
  ('account_xp_sources', '{"firstWinOfDay": 100, "lesson": 60}'::jsonb)
on conflict (key) do nothing;

insert into public.economy_config (key, value) values
  ('account_level_unlocks_v1', jsonb_build_object(
     'grandfatherBefore', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
     'features', '{"daily": 2, "deckBuilder": 3, "pveNormal": 3, "friends": 4, "ranked": 5, "season": 5, "pveHard": 5, "classic": 6, "deckPublish": 7}'::jsonb))
on conflict (key) do nothing;

-- ── 8) Ar funkcija žaidėjui atrakinta (serverio tiesa) ─────────────────────
--  Atvira, jei: funkcija neaprašyta, žaidėjas adminas/testeris, paskyra sukurta iki
--  pertvarkos, arba lygis pakankamas. Nežinomas žaidėjas → atvira (neblokuojam per klaidą).
create or replace function public.rvn__feature_unlocked(p_user uuid, p_feature text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_cfg jsonb; v_req int; v_p record;
begin
  select value into v_cfg from public.economy_config where key = 'account_level_unlocks_v1';
  v_req := (v_cfg->'features'->>p_feature)::int;
  if v_req is null or v_req <= 1 then return true; end if;
  select role, created_at, coalesce(xp_total,0) as xp into v_p from public.profiles where id = p_user;
  if not found then return true; end if;
  if v_p.role in ('admin','tester') then return true; end if;
  if v_cfg->>'grandfatherBefore' is not null and v_p.created_at < (v_cfg->>'grandfatherBefore')::timestamptz then return true; end if;
  return public.rvn__level_from_xp(v_p.xp) >= v_req;
end $$;

create or replace function public.rvn_get_unlocks()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cfg jsonb; v_p record; v_gf boolean := false; v_lvl int := 1;
begin
  select value into v_cfg from public.economy_config where key = 'account_level_unlocks_v1';
  if v_uid is not null then
    select role, created_at, coalesce(xp_total,0) as xp into v_p from public.profiles where id = v_uid;
    if found then
      v_lvl := public.rvn__level_from_xp(v_p.xp);
      v_gf := v_p.role in ('admin','tester')
           or (v_cfg->>'grandfatherBefore' is not null and v_p.created_at < (v_cfg->>'grandfatherBefore')::timestamptz);
    end if;
  end if;
  return jsonb_build_object(
    'level', v_lvl,
    'allOpen', v_gf,
    'features', coalesce(v_cfg->'features', '{}'::jsonb));
end $$;
grant execute on function public.rvn_get_unlocks() to authenticated;

-- ── 9) Reitingo eilė: serverio patikra (sąsajos užraktą apeiti nepakanka) ──
create or replace function public.rvn__trg_ranked_queue_unlock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.rvn__feature_unlocked(new.user_id, 'ranked') then
    raise exception 'feature_locked: reitingas atrakinamas pasiekus reikiamą paskyros lygį';
  end if;
  return new;
end $$;
drop trigger if exists trg_ranked_queue_unlock on public.ranked_queue;
create trigger trg_ranked_queue_unlock before insert on public.ranked_queue
  for each row execute function public.rvn__trg_ranked_queue_unlock();

-- ── 10) Pamokos: paskyros XP už PIRMĄ įveikimą ─────────────────────────────
--  Bazė: 20260716_tutorial_system.sql (vienintelis apibrėžimas). Pridėta tik XP dalis.
create or replace function public.rvn_tutorial_complete(p_lesson uuid, p_time_ms int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_payload jsonb; v_claimed boolean; v_first boolean;
  v_xp int := 0; v_levelRewards jsonb := '[]'::jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select reward_payload into v_payload from public.tutorial_lessons where id = p_lesson;

  insert into public.tutorial_progress (user_id, lesson_id, completed, attempts, best_time_ms, completed_at, updated_at)
    values (v_uid, p_lesson, true, 1, p_time_ms, now(), now())
  on conflict (user_id, lesson_id) do update set
    completed = true,
    best_time_ms = least(coalesce(public.tutorial_progress.best_time_ms, 2147483647),
                         coalesce(p_time_ms, public.tutorial_progress.best_time_ms, 2147483647)),
    completed_at = coalesce(public.tutorial_progress.completed_at, now()),
    updated_at = now()
  returning reward_claimed into v_claimed;

  if not coalesce(v_claimed, false) then
    begin
      perform public.rvn__grant_payload(v_uid, coalesce(v_payload, '{}'::jsonb), 'tutorial');
    exception when others then null;  -- atlygis niekada nelaužia užbaigimo
    end;
    update public.tutorial_progress set reward_claimed = true where user_id = v_uid and lesson_id = p_lesson;
    v_first := true;
    -- (848) paskyros XP už pamoką + lygio atlygiai, jei pakilo lygis
    begin
      select coalesce((value->>'lesson')::int, 0) into v_xp from public.economy_config where key = 'account_xp_sources';
      if coalesce(v_xp, 0) > 0 then
        update public.profiles set xp_total = coalesce(xp_total, 0) + v_xp where id = v_uid;
        v_levelRewards := public.rvn__check_level_rewards(v_uid);
      end if;
    exception when others then v_xp := 0;  -- XP niekada nelaužia užbaigimo
    end;
  else
    v_first := false;
  end if;

  return jsonb_build_object('ok', true, 'firstTime', v_first, 'reward', coalesce(v_payload, '{}'::jsonb),
    'accountXp', case when v_first then coalesce(v_xp, 0) else 0 end, 'levelRewards', v_levelRewards);
end $$;
grant execute on function public.rvn_tutorial_complete(uuid, int) to authenticated;

-- ── 11) Kovos ataskaita: pirma dienos pergalė ──────────────────────────────
--  Bazė: 20261115b_live_events.sql (vėliausias apibrėžimas), pridėtas TIK bonuso
--  blokas prieš reitingo dalį ir `firstWinBonus` atsakyme.
create or replace function public.rvn_report_match_v2(
  p_client_match_id uuid, p_mode text, p_result text,
  p_duration_seconds integer default 0, p_turns integer default 0,
  p_player_actions integer default 0, p_opponent_actions integer default 0,
  p_opponent_id uuid default null, p_opponent_type text default 'human',
  p_difficulty text default null, p_opponent_deck text default null, p_format text default 'zmk')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb; v_val jsonb; v_streak jsonb; v_mode jsonb; v_side jsonb;
  v_won boolean := (p_result = 'win');
  v_valid boolean; v_minA int; v_axp int; v_sxp int; v_slv int; v_lvl int;
  v_cap int; v_cnt int; v_after jsonb; v_streakCount int := 0; v_delta int := 0;
  v_xp0 bigint; v_xp1 bigint; v_payload jsonb; v_bonus jsonb; v_levelRewards jsonb := '[]'::jsonb;
  v_evt jsonb; v_base jsonb;
  v_fw int := 0; v_firstWin int := 0;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if p_client_match_id is not null and exists (select 1 from public.matches where user_id=v_uid and client_match_id=p_client_match_id) then
    select jsonb_build_object('valid', valid_for_rewards, 'duplicate', true,
      'rewards', jsonb_build_object('account_xp',account_xp_reward,'season_xp',season_xp_reward,'silver',silver_reward))
      into v_payload from public.matches where user_id=v_uid and client_match_id=p_client_match_id limit 1;
    return v_payload;
  end if;

  select value into v_cfg    from public.economy_config where key='match_rewards';
  select value into v_val    from public.economy_config where key='match_validity';
  select value into v_streak from public.economy_config where key='win_streak_bonus';
  v_mode := v_cfg->p_mode;
  if v_mode is null then return jsonb_build_object('error','unknown mode'); end if;

  v_minA := coalesce((v_val->>'min_actions')::int,3);
  v_valid := p_duration_seconds >= coalesce((v_val->>'min_duration_seconds')::int,180)
          or p_turns            >= coalesce((v_val->>'min_turns')::int,5)
          or (p_player_actions >= v_minA and p_opponent_actions >= v_minA);

  if not v_valid then
    insert into public.matches(user_id, client_match_id, opponent_id, opponent_type, mode, result,
      duration_seconds, turns_played, player_actions_count, opponent_actions_count, valid_for_rewards, difficulty, opponent_deck, format)
      values (v_uid, p_client_match_id, p_opponent_id, p_opponent_type, p_mode, p_result,
      p_duration_seconds, p_turns, p_player_actions, p_opponent_actions, false, p_difficulty, p_opponent_deck, case when p_format='classic' then 'classic' else 'zmk' end);
    if v_won is not true and p_mode='ranked' then update public.profiles set ranked_win_streak=0 where id=v_uid; end if;
    return jsonb_build_object('valid', false);
  end if;

  v_side := v_mode->(case when v_won then 'win' else 'loss' end);
  v_axp := coalesce((v_side->>'account_xp')::int,0);
  v_sxp := coalesce((v_side->>'season_xp')::int,0);
  v_slv := coalesce((v_side->>'silver')::int,0);

  -- PvE: sidabras pagal sudėtingumą × varžovo kaladę (bot.silver_by_level), jei nustatyta
  if p_mode = 'bot' and p_difficulty is not null and p_opponent_deck is not null then
    v_lvl := (v_mode->'silver_by_level'->p_opponent_deck->>p_difficulty)::int;
    if v_lvl is not null then
      v_slv := case when v_won then v_lvl else floor(v_lvl * 0.25) end;
    end if;
  end if;

  v_cap := coalesce((v_mode->>'daily_cap')::int, 0);
  if v_cap > 0 then
    select count(*) into v_cnt from public.matches
      where user_id=v_uid and mode=p_mode and valid_for_rewards and created_at >= date_trunc('day', now());
    if v_cnt >= v_cap then
      v_after := v_mode->'after_cap';
      v_axp := floor(v_axp * coalesce((v_after->>'account_xp_pct')::numeric,100) / 100.0);
      v_sxp := floor(v_sxp * coalesce((v_after->>'season_xp_pct')::numeric,100) / 100.0);
      v_slv := floor(v_slv * coalesce((v_after->>'silver_pct')::numeric,100) / 100.0);
    end if;
  end if;

  -- LIVE EVENTAI: daugikliai (po dienos ribos, prieš serijos bonusą)
  v_base := jsonb_build_object('account_xp', v_axp, 'season_xp', v_sxp, 'silver', v_slv);
  v_evt := public.rvn__event_match_multipliers(v_uid, p_mode, v_won);
  if v_evt is not null then
    v_axp := floor(v_axp * (v_evt->>'account_xp')::numeric);
    v_sxp := floor(v_sxp * (v_evt->>'season_xp')::numeric);
    v_slv := floor(v_slv * (v_evt->>'silver')::numeric);
    v_evt := v_evt || jsonb_build_object('bonus', jsonb_build_object(
      'account_xp', v_axp - (v_base->>'account_xp')::int,
      'season_xp',  v_sxp - (v_base->>'season_xp')::int,
      'silver',     v_slv - (v_base->>'silver')::int));
  end if;

  -- (848) PIRMA DIENOS PERGALĖ: papildomas paskyros XP kartą per dieną (UTC), bet kuriame režime.
  --  Skaičiuojama po eventų daugiklių, kad bonusas nebūtų dauginamas.
  if v_won then
    select coalesce((value->>'firstWinOfDay')::int, 0) into v_fw from public.economy_config where key = 'account_xp_sources';
    if coalesce(v_fw, 0) > 0 and not exists (
      select 1 from public.matches
       where user_id = v_uid and result = 'win' and valid_for_rewards
         and created_at >= date_trunc('day', now())) then
      v_firstWin := v_fw;
      v_axp := v_axp + v_firstWin;
    end if;
  end if;

  if p_mode='ranked' then
    if v_won then
      update public.profiles set ranked_win_streak = ranked_win_streak + 1 where id=v_uid returning ranked_win_streak into v_streakCount;
      if v_streakCount >= 5 then v_bonus := v_streak->'5';
      elsif v_streakCount >= 3 then v_bonus := v_streak->'3'; end if;
      if v_bonus is not null then
        v_sxp := v_sxp + coalesce((v_bonus->>'season_xp')::int,0);
        v_slv := v_slv + coalesce((v_bonus->>'silver')::int,0);
      end if;
    else
      update public.profiles set ranked_win_streak = 0 where id=v_uid;
    end if;
    v_delta := coalesce((v_mode->>(case when v_won then 'ranked_step_win' else 'ranked_step_loss' end))::int, 0);
  end if;

  select coalesce(xp_total,0) into v_xp0 from public.profiles where id=v_uid;

  v_payload := jsonb_build_array(
    jsonb_build_object('type','account_xp','amount',v_axp),
    jsonb_build_object('type','season_xp','amount',v_sxp),
    jsonb_build_object('type','currency','currency','silver','amount',v_slv)
  );
  perform public.rvn__grant_reward_payload(v_uid, v_payload, 'match', p_client_match_id::text);

  v_levelRewards := public.rvn__check_level_rewards(v_uid);

  insert into public.matches(user_id, client_match_id, opponent_id, opponent_type, mode, result,
    duration_seconds, turns_played, player_actions_count, opponent_actions_count, valid_for_rewards,
    account_xp_reward, season_xp_reward, silver_reward, ranked_progress_delta, difficulty, opponent_deck, format)
    values (v_uid, p_client_match_id, p_opponent_id, p_opponent_type, p_mode, p_result,
    p_duration_seconds, p_turns, p_player_actions, p_opponent_actions, true,
    v_axp, v_sxp, v_slv, v_delta, p_difficulty, p_opponent_deck, case when p_format='classic' then 'classic' else 'zmk' end);

  select coalesce(xp_total,0) into v_xp1 from public.profiles where id=v_uid;
  v_xp1 := greatest(v_xp1, v_xp0 + v_axp);

  return jsonb_build_object(
    'valid', true, 'result', p_result,
    'rewards', jsonb_build_object('account_xp',v_axp,'season_xp',v_sxp,'silver',v_slv),
    'streak', v_streakCount, 'rankedDelta', v_delta,
    'accountXpBefore', v_xp0, 'accountXpAfter', v_xp1,
    'levelRewards', v_levelRewards,
    'firstWinBonus', v_firstWin,
    'event', v_evt,
    'balances', (select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid)
  );
end $function$;

grant execute on function public.rvn_report_match_v2(uuid, text, text, integer, integer, integer, integer, uuid, text, text, text, text) to authenticated;

-- ── 5) PERŠOKTI LYGIAI: išduodam naujai pasiektų lygių atlygius ────────────
--  Kiekvienas žaidėjas atskirai; vieno klaida nesustabdo kitų (lieka kitam kartui –
--  tą patį padarys rvn__check_level_rewards po artimiausios kovos).
do $$
declare r record; v_n int := 0; v_fail int := 0;
begin
  for r in select id from public.profiles
            where public.rvn__level_from_xp(coalesce(xp_total,0)) >= 2 loop
    begin
      if jsonb_array_length(public.rvn__check_level_rewards(r.id)) > 0 then v_n := v_n + 1; end if;
    exception when others then
      v_fail := v_fail + 1;
      raise notice 'LYGIAI v4: žaidėjui % atlygių išduoti nepavyko: %', r.id, sqlerrm;
    end;
  end loop;
  raise notice 'LYGIAI v4: atlygiai už peršoktus lygius išduoti % žaidėjams, klaidų %', v_n, v_fail;
end $$;

-- ── 6) Sveikatos patikra ───────────────────────────────────────────────────
do $$
declare i int; n int;
begin
  if public.rvn__xp_for_level(1) <> 0 or public.rvn__xp_for_level(5) <> 540
     or public.rvn__xp_for_level(26) <> 19270 or public.rvn__xp_for_level(50) <> 99800 then
    raise exception 'XP slenksčiai neatitinka levels.ts';
  end if;
  for i in 1..50 loop
    if public.rvn__level_from_xp(public.rvn__xp_for_level(i)) <> i then
      raise exception 'rvn__xp_for_level ir rvn__level_from_xp nesutampa ties % lygiu', i;
    end if;
    if i > 1 and public.rvn__level_from_xp(public.rvn__xp_for_level(i) - 1) <> i - 1 then
      raise exception 'slenkstis % lygiui netikslus', i;
    end if;
  end loop;
  select count(*) into n from generate_series(2,50) L where jsonb_array_length(public.rvn__account_level_payload_v4(L)) = 0;
  if n > 0 then raise exception '% lygiai be atlygio', n; end if;
  if public.rvn__account_level_payload_v4(1) <> '[]'::jsonb then raise exception '1 lygis neturi duoti atlygio'; end if;
  if not (public.rvn__account_level_payload_v4(28) @> '[{"type":"essence","amount":500}]'::jsonb) then
    raise exception '28 lygis turi duoti 500 esencijos, gavom %', public.rvn__account_level_payload_v4(28);
  end if;
  raise notice 'LYGIAI v4: 49 lygiai sukonfigūruoti, 50 lygis = %', public.rvn__account_level_payload_v4(50);
end $$;
