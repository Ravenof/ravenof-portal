-- ════════════════════════════════════════════════════════════════════════════
--  PASKYROS LYGIS 1–50 · ATLYGIŲ EKONOMIKA v3 (Profile handoff, ekranas 05)
--  ─────────────────────────────────────────────────────────────────────────
--  Pakeičia 20260811 „adityvinę" schemą (every / every5 / every10) TIKSLIA
--  handoff'o lentele (docs/profile-handoff/IMPLEMENTATION.md §2, ekranas 05):
--    5/15  → 1 iš 3 matomų RARE kortų        10 → 50 rubinų + nugarėlė
--    25/45 → 1 iš 3 matomų EPIC kortų        20 → 75 rubinų + nugarėlė
--    35    → 2 boosteriai (kiekvienas        30 → 100 rubinų + nugarėlė
--             renkamas atskirai)             40 → 125 rubinų + nugarėlė
--    50    → 1 iš 3 LEGENDARY + 200 rubinų + išskirtinė nugarėlė
--    nelyginiai → sidabras 200 + round(n/2)·50 · lyginiai → 1 boosterio pasirinkimas
--
--  SVARBU:
--  • Atlygiai skiriami per BENDRĄ variklį rvn__grant_rewards_v2 → pasirinkimai
--    krenta į reward_choices su source_type='level' ir keliauja tuo pačiu
--    ChoiceQueue kanalu kaip sezonas / dienos užduotys. Antros lygiagrečios
--    sistemos NĖRA.
--  • Iškvietimo taškai NESIKEIČIA: rvn__check_level_rewards() vardas paliktas,
--    tad rvn_report_match_v2 (20260811) ir dienos užduotys (20260813) automatiškai
--    pradeda dalinti v3 atlygius.
--  • BACKFILL be „windfall": visi jau pasiekti lygiai pažymimi kaip atsiimti
--    grupėje 'level_v3' NIEKO neišduodant — seni žaidėjai negauna kortų krūvos
--    už lygius, kuriuos praėjo su senąja ekonomika.
--  Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Išskirtinė 50 lygio nugarėlė ────────────────────────────────────────
--  is_active = false: parduotuvė ir dienos pasiūlymas ją praleidžia
--  (abu filtruoja `where is_active`), o rvn__grant_rewards_v2 nefiltruoja —
--  tad išduoti galima, nusipirkti ne. Kad turimas daiktas nedingtų iš
--  kosmetikos ekrano, žemiau pataisom rvn_get_cosmetics.
insert into public.cosmetics (id, kind, name, description, price_gold, css, rarity, sort_order, is_active) values
  ('prestige_card_back', 'card_back', 'Prestižo nugarėlė',
   'Išskirtinė 50 lygio nugarėlė — jos nusipirkti negalima', 0,
   'linear-gradient(160deg,#9B3A48,#6E2633 45%,#1a0d12)', 'legendary', 50, false)
on conflict (id) do nothing;

-- ── 2) rvn_get_cosmetics: rodyti ir TURIMUS neaktyvius daiktus ─────────────
--  (anksčiau bet kuris išjungtas daiktas dingdavo iš savininko kolekcijos)
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'description',description,
                                      'priceGold',price_gold,'css',css,'emoji',emoji,'imageUrl',image_url) order by sort_order, name)
    into v_list from public.cosmetics
   where is_active
      or id in (select cosmetic_id from public.user_cosmetics where user_id = v_uid);
  select coalesce(jsonb_agg(cosmetic_id),'[]'::jsonb) into v_owned from public.user_cosmetics where user_id=v_uid;
  select equipped_card_back, equipped_board, equipped_avatar into v_cb, v_bd, v_av from public.profiles where id=v_uid;
  return jsonb_build_object('items', coalesce(v_list,'[]'::jsonb), 'owned', v_owned,
    'equippedCardBack', v_cb, 'equippedBoard', v_bd, 'equippedAvatar', v_av);
end $$;

-- ── 3) Konfigūracija: TIKSLI lygių lentelė (serveris = tiesos šaltinis) ────
insert into public.economy_config (key, value) values ('account_level_rewards_v3', $j$
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
  "levels": {
    "2": [
      {
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "3": [
      {
        "type": "silver",
        "amount": 300
      }
    ],
    "4": [
      {
        "type": "faction_booster_choice",
        "quantity": 1
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
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "7": [
      {
        "type": "silver",
        "amount": 400
      }
    ],
    "8": [
      {
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "9": [
      {
        "type": "silver",
        "amount": 450
      }
    ],
    "10": [
      {
        "type": "rubies",
        "amount": 50
      },
      {
        "type": "card_back",
        "cosmeticId": "basic_card_back"
      }
    ],
    "11": [
      {
        "type": "silver",
        "amount": 500
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
        "type": "silver",
        "amount": 550
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
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "17": [
      {
        "type": "silver",
        "amount": 650
      }
    ],
    "18": [
      {
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "19": [
      {
        "type": "silver",
        "amount": 700
      }
    ],
    "20": [
      {
        "type": "rubies",
        "amount": 75
      },
      {
        "type": "card_back",
        "cosmeticId": "rare_card_back"
      }
    ],
    "21": [
      {
        "type": "silver",
        "amount": 750
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
        "type": "silver",
        "amount": 800
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
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "27": [
      {
        "type": "silver",
        "amount": 900
      }
    ],
    "28": [
      {
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "29": [
      {
        "type": "silver",
        "amount": 950
      }
    ],
    "30": [
      {
        "type": "rubies",
        "amount": 100
      },
      {
        "type": "card_back",
        "cosmeticId": "premium_card_back"
      }
    ],
    "31": [
      {
        "type": "silver",
        "amount": 1000
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
        "type": "silver",
        "amount": 1050
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
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "37": [
      {
        "type": "silver",
        "amount": 1150
      }
    ],
    "38": [
      {
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "39": [
      {
        "type": "silver",
        "amount": 1200
      }
    ],
    "40": [
      {
        "type": "rubies",
        "amount": 125
      },
      {
        "type": "card_back",
        "cosmeticId": "legendary_card_back"
      }
    ],
    "41": [
      {
        "type": "silver",
        "amount": 1250
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
        "type": "silver",
        "amount": 1300
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
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "47": [
      {
        "type": "silver",
        "amount": 1400
      }
    ],
    "48": [
      {
        "type": "faction_booster_choice",
        "quantity": 1
      }
    ],
    "49": [
      {
        "type": "silver",
        "amount": 1450
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
on conflict (key) do update set value = excluded.value;

-- ── 4) Lygio atlygis iš konfigūracijos ─────────────────────────────────────
create or replace function public.rvn__account_level_payload_v3(p_level int)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(
    (select value->'levels'->(p_level::text) from public.economy_config where key = 'account_level_rewards_v3'),
    '[]'::jsonb)
$$;
grant execute on function public.rvn__account_level_payload_v3(int) to authenticated;

-- ── 4b) XP riba lygiui (VEIDRODIS rvn__level_from_xp / levels.ts) ─────────
create or replace function public.rvn__xp_for_level(p_level int)
returns bigint language plpgsql immutable as $$
declare
  t bigint[] := array[0,100,250,500,850,1250,1750,2350,3000,3750,4600,5500,6500,7600,8800,
    10100,11500,13000,14600,16300,18100,20000,22000,24100,26300,28600,31000,33500,36100,38800,
    41700,44800,48100,51600,55300,59200,63300,67600,72100,76800,81500,86000,90000,93500,96500,
    98000,99000,99500,99800,100000];
begin
  if p_level < 1 then return 0; end if;
  if p_level > 50 then return t[50]; end if;
  return t[p_level];
end $$;
grant execute on function public.rvn__xp_for_level(int) to authenticated;

-- ── 5) BACKFILL: jau pasiekti lygiai = atsiimti, BE atlygio ────────────────
insert into public.user_level_reward_claims(user_id, level, reward_group)
select p.id, gs.L, 'level_v3'
from public.profiles p
cross join lateral generate_series(2, greatest(2, public.rvn__level_from_xp(coalesce(p.xp_total,0)))) as gs(L)
where public.rvn__level_from_xp(coalesce(p.xp_total,0)) >= 2
on conflict do nothing;

-- ── 5b) SUDERINAMUMAS: granted (RewardDefinition) → senas „payload" formatas ──
--  Po kovos ekranas (TutorialGame „ATRAKINTA" plytelės) skaito
--  {type:'currency',currency,amount} / {type:'item',item_type,item_id}. Be šios
--  konversijos jis tyliai nustotų rodyti lygio atlygius. Pasirinkimai (card_choice /
--  faction_booster_choice) čia NEPATENKA — jie dar nesuteikti, jiems yra pendingChoices.
create or replace function public.rvn__granted_to_legacy(p_granted jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(case
      when el->>'type' in ('silver','essence','rubies')
        then jsonb_build_object('type','currency','currency', el->>'type','amount', coalesce((el->>'amount')::int,0))
      when el->>'type' in ('card_back','player_avatar')
        then jsonb_build_object('type','item','item_type', el->>'type','item_id', el->>'cosmeticId','quantity',1)
      else el end), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_granted, '[]'::jsonb)) el
$$;
grant execute on function public.rvn__granted_to_legacy(jsonb) to authenticated;

-- ── 6) Lygio patikra → v3 atlygiai per bendrą variklį ──────────────────────
--  Vardas TAS PATS, tad esami iškvietimai (match report, dienos užduotys) veikia.
create or replace function public.rvn__check_level_rewards(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_lvl int; L int; v_ins int; v_pay jsonb; v_res jsonb; v_out jsonb := '[]'::jsonb;
begin
  if p_user is null then return '[]'::jsonb; end if;
  select public.rvn__level_from_xp(coalesce(xp_total,0)) into v_lvl from public.profiles where id = p_user;
  if v_lvl is null or v_lvl < 2 then return '[]'::jsonb; end if;
  for L in 2..v_lvl loop
    insert into public.user_level_reward_claims(user_id, level, reward_group)
      values (p_user, L, 'level_v3') on conflict do nothing;
    get diagnostics v_ins = row_count;
    if v_ins > 0 then
      v_pay := public.rvn__account_level_payload_v3(L);
      if jsonb_array_length(v_pay) > 0 then
        v_res := public.rvn__grant_rewards_v2(p_user, v_pay, 'level', 'level:' || L::text);
        v_out := v_out || jsonb_build_array(jsonb_build_object(
          'level', L,
          -- senas raktas — kad po kovos ekranas veiktų be pakeitimų
          'payload', public.rvn__granted_to_legacy(v_res->'granted'),
          'rewards', v_pay,
          'granted', v_res->'granted',
          'pendingChoices', v_res->'pendingChoices'));
      end if;
    end if;
  end loop;
  return v_out;
end $$;
grant execute on function public.rvn__check_level_rewards(uuid) to authenticated;

-- ── 7) Ekrano 05 duomenys ──────────────────────────────────────────────────
--  Grąžina VISKĄ, ko reikia UI: lygį, XP ribas, 49 lygių takelį su atlygiais ir
--  būsena, laukiančius pasirinkimus ir balansus. UI nieko neskaičiuoja pats.
create or replace function public.rvn_get_account_level(p_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_self boolean := (p_user_id is null or p_user_id = auth.uid());
  v_xp bigint; v_lvl int; v_cur bigint; v_next bigint; v_track jsonb; v_ms jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select coalesce(xp_total,0) into v_xp from public.profiles where id = v_uid;
  if v_xp is null then return jsonb_build_object('error','no_profile'); end if;

  v_lvl  := public.rvn__level_from_xp(v_xp);
  v_cur  := public.rvn__xp_for_level(v_lvl);
  v_next := case when v_lvl >= 50 then null else public.rvn__xp_for_level(v_lvl + 1) end;
  select value->'milestoneLevels' into v_ms from public.economy_config where key = 'account_level_rewards_v3';

  select jsonb_agg(jsonb_build_object(
      'level', L,
      'xpRequired', public.rvn__xp_for_level(L),
      'rewards', public.rvn__account_level_payload_v3(L),
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
    from generate_series(2, 50) as gs(L);

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
    'pendingChoices', case when v_self then public.rvn__pending_choices(v_uid) else '[]'::jsonb end,
    'balances', case when v_self then public.rvn__balances(v_uid) else '{}'::jsonb end
  );
end $$;
grant execute on function public.rvn_get_account_level(uuid) to authenticated;

-- ── 8) Sveikatos patikra ───────────────────────────────────────────────────
do $$
declare n int; v_50 jsonb; v_3 jsonb;
begin
  select jsonb_array_length(value->'levels'->'50') into n from public.economy_config where key='account_level_rewards_v3';
  if n <> 3 then raise exception '50 lygis turi turėti 3 atlygius, rasta %', n; end if;
  select public.rvn__account_level_payload_v3(50) into v_50;
  select public.rvn__account_level_payload_v3(3)  into v_3;
  if not (v_3 @> '[{"type":"silver","amount":300}]'::jsonb) then
    raise exception '3 lygis turi duoti 300 sidabro, gavom %', v_3;
  end if;
  if public.rvn__xp_for_level(20) <> 16300 or public.rvn__xp_for_level(50) <> 100000 then
    raise exception 'XP slenksčiai neatitinka levels.ts (20=% 50=%)',
      public.rvn__xp_for_level(20), public.rvn__xp_for_level(50);
  end if;
  if public.rvn__level_from_xp(public.rvn__xp_for_level(37)) <> 37 then
    raise exception 'rvn__xp_for_level ir rvn__level_from_xp nesutampa ties 37 lygiu';
  end if;
  if public.rvn__granted_to_legacy('[{"type":"rubies","amount":50}]'::jsonb)
     <> '[{"type":"currency","currency":"rubies","amount":50}]'::jsonb then
    raise exception 'rvn__granted_to_legacy konversija neteisinga';
  end if;
  raise notice 'LYGIAI v3: 49 lygiai sukonfigūruoti, 50 lygis = %', v_50;
end $$;
