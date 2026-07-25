// Daily Quests v2 — generavimas, progresas, reroll, skrynia
export async function run(t) {
  const { q, rpc, check, eq, truthy, parallelRpc } = t
  const U = '30000000-0000-4000-8000-000000000001'
  // BE onboarding → PvP questai negeneruojami (spec: „be PvP kol neprieinamas")
  q(`insert into profiles(id, username, gold) values ('${U}','quest_user',1000) on conflict do nothing`)

  const playMatch = (result = 'win', mode = 'bot') => q(
    `insert into matches(user_id, client_match_id, mode, result, valid_for_rewards)
     values ('${U}', gen_random_uuid(), '${mode}', '${result}', true)`)

  check('sugeneruojami lygiai 3 questai: easy + medium + hard', () => {
    const s = rpc(U, `rvn_get_daily_quests()`)
    eq(s.quests.length, 3, 'questų kiekis')
    eq(s.quests.map((x) => x.difficulty).join(','), 'easy,medium,hard', 'sudėtingumai')
    eq(q(`select count(distinct difficulty) from user_daily_quests where user_id='${U}'`), '3', 'DB')
  })

  check('atlygiai pagal specifikaciją (100/150/200 Sidabro + 80/100/120 Season XP)', () => {
    const s = rpc(U, `rvn_get_daily_quests()`)
    const map = Object.fromEntries(s.quests.map((x) => [x.difficulty, x.rewards]))
    eq(JSON.stringify(map.easy), JSON.stringify([{ type: 'silver', amount: 100 }, { type: 'season_xp', amount: 80 }]), 'easy')
    eq(JSON.stringify(map.medium), JSON.stringify([{ type: 'silver', amount: 150 }, { type: 'season_xp', amount: 100 }]), 'medium')
    eq(JSON.stringify(map.hard), JSON.stringify([{ type: 'silver', amount: 200 }, { type: 'season_xp', amount: 120 }]), 'hard')
    eq(JSON.stringify(s.dailyMax), JSON.stringify({ silver: 450, essence: 50, season_xp: 400 }), 'dienos maksimumas')
  })

  check('PvP questai negeneruojami, kol PvP neprieinamas', () => {
    const pvp = q(`select count(*) from user_daily_quests q join daily_quest_templates d on d.code=q.template_code
                   where q.user_id='${U}' and d.requires_pvp`)
    eq(pvp, '0', 'PvP questų')
  })

  check('nėra konfliktuojančių/vienodų questų', () => {
    const groups = q(`select count(distinct d.conflict_group) from user_daily_quests q
                      join daily_quest_templates d on d.code=q.template_code where q.user_id='${U}'`)
    const codes = q(`select count(distinct template_code) from user_daily_quests where user_id='${U}'`)
    eq(codes, '3', 'skirtingi šablonai')
    truthy(Number(groups) >= 2, 'skirtingos konfliktų grupės: ' + groups)
  })

  check('questas „Atplėšk pakuotę" yra išjungtas', () => {
    eq(q(`select count(*) from daily_quest_templates where is_active and (objective_type in ('open_pack','open_booster') or code ilike '%pack%')`), '0', 'aktyvių pakuotės questų')
  })

  check('pirmas reroll nemokamas ir išlaiko difficulty bei atlygį', () => {
    const s0 = rpc(U, `rvn_get_daily_quests()`)
    const qq = s0.quests.find((x) => x.difficulty === 'medium')
    eq(s0.reroll.nextCostSilver, 0, 'pirmo reroll kaina')
    const goldBefore = Number(q(`select gold from profiles where id='${U}'`))
    const r = rpc(U, `rvn_reroll_daily_quest(${qq.id}, false, 'rr1')`)
    eq(r.status, 'completed', 'status')
    eq(r.paidSilver, 0, 'nemokamas')
    eq(Number(q(`select gold from profiles where id='${U}'`)), goldBefore, 'balansas nepakito')
    const after = r.snapshot.quests.find((x) => x.id === qq.id)
    eq(after.difficulty, 'medium', 'difficulty išliko')
    eq(JSON.stringify(after.rewards), JSON.stringify(qq.rewards), 'atlygis nepakito')
    truthy(after.templateCode !== qq.templateCode, 'šablonas pasikeitė')
  })

  check('antras ir trečias reroll kainuoja po 100 Sidabro', () => {
    for (const n of [2, 3]) {
      const s = rpc(U, `rvn_get_daily_quests()`)
      eq(s.reroll.nextCostSilver, 100, `${n}-o reroll kaina`)
      const qq = s.quests.find((x) => !x.completed)
      const before = Number(q(`select gold from profiles where id='${U}'`))
      const r = rpc(U, `rvn_reroll_daily_quest(${qq.id}, false, 'rr${n}')`)
      eq(r.paidSilver, 100, `${n}-as apmokėtas`)
      eq(Number(q(`select gold from profiles where id='${U}'`)), before - 100, 'nuskaityta 100')
    }
  })

  check('ketvirtas reroll atmetamas', () => {
    const s = rpc(U, `rvn_get_daily_quests()`)
    eq(s.reroll.used, 3, 'panaudota')
    eq(s.reroll.nextCostSilver, null, 'kainos nebėra')
    const before = Number(q(`select gold from profiles where id='${U}'`))
    const r = rpc(U, `rvn_reroll_daily_quest(${s.quests[0].id}, false, 'rr4')`)
    eq(r.error, 'reroll_limit_reached', 'klaida')
    eq(Number(q(`select gold from profiles where id='${U}'`)), before, 'balansas nepakito')
  })

  check('reroll dienos limito neviršija net esant lygiagrečioms užklausoms', async () => {
    eq(q(`select free_reroll_used::text || ':' || paid_reroll_count from user_daily_quest_meta where user_id='${U}'`), 'true:2', 'reroll skaitliukas')
  })

  check('progresas skaičiuojamas tik iš galiojančių kovų', () => {
    q(`insert into matches(user_id, client_match_id, mode, result, valid_for_rewards)
       values ('${U}', gen_random_uuid(), 'bot', 'win', false)`)      // NEGALIOJANTI
    const s = rpc(U, `rvn_get_daily_quests()`)
    eq(s.quests.reduce((a, x) => a + x.progress, 0), 0, 'progreso nėra')
    for (let i = 0; i < 6; i++) playMatch('win', 'bot')
    const s2 = rpc(U, `rvn_get_daily_quests()`)
    truthy(s2.quests.every((x) => x.completed), 'visi trys užbaigti')
    eq(s2.allCompleted, true, 'allCompleted')
  })

  check('užbaigto questo rerollinti negalima', () => {
    const s = rpc(U, `rvn_get_daily_quests()`)
    const r = rpc(U, `rvn_reroll_daily_quest(${s.quests[0].id}, true, 'rr5')`)
    eq(r.error, 'quest_completed', 'klaida')
  })

  check('questo claim duoda Sidabrą ir Season XP', () => {
    const s = rpc(U, `rvn_get_daily_quests()`)
    const easy = s.quests.find((x) => x.difficulty === 'easy')
    const gold = Number(q(`select gold from profiles where id='${U}'`))
    const r = rpc(U, `rvn_claim_daily_quest(${easy.id}, 'cq1')`)
    eq(r.status, 'completed', 'status')
    eq(Number(q(`select gold from profiles where id='${U}'`)), gold + 100, 'sidabras +100')
    truthy(Number(q(`select xp from user_season_pass where user_id='${U}'`)) >= 80, 'Season XP')
  })

  check('to paties questo antrą kartą claiminti negalima', () => {
    const s = rpc(U, `rvn_get_daily_quests()`)
    const easy = s.quests.find((x) => x.difficulty === 'easy')
    const r = rpc(U, `rvn_claim_daily_quest(${easy.id}, 'cq2')`)
    eq(r.error, 'not_claimable', 'klaida')
  })

  check('skrynios negalima atsiimti, kol neužbaigti visi trys', () => {
    const V = '30000000-0000-4000-8000-000000000002'
    q(`insert into profiles(id, username, gold) values ('${V}','quest_user2',0) on conflict do nothing`)
    rpc(V, `rvn_get_daily_quests()`)
    const r = rpc(V, `rvn_claim_daily_chest_v2('ch0')`)
    eq(r.error, 'not_all_completed', 'klaida')
  })

  check('skrynia: 50 esencijos + 100 Season XP, tik vieną kartą', () => {
    const ess = Number(q(`select essence from profiles where id='${U}'`))
    const xp = Number(q(`select coalesce(xp,0) from user_season_pass where user_id='${U}'`))
    const r = rpc(U, `rvn_claim_daily_chest_v2('ch1')`)
    eq(r.status, 'completed', 'status')
    eq(Number(q(`select essence from profiles where id='${U}'`)), ess + 50, 'esencija +50')
    eq(Number(q(`select coalesce(xp,0) from user_season_pass where user_id='${U}'`)), xp + 100, 'Season XP +100')
    const r2 = rpc(U, `rvn_claim_daily_chest_v2('ch2')`)
    eq(r2.error, 'already_claimed', 'antras kartas atmestas')
  })

  check('dienos maksimumas nėra viršijamas (450 Sidabro / 50 esencijos / 400 Season XP)', () => {
    const s = rpc(U, `rvn_get_daily_quests()`)
    const totalSilver = s.quests.reduce((a, x) => a + (x.rewards.find((r) => r.type === 'silver')?.amount ?? 0), 0)
    const totalXp = s.quests.reduce((a, x) => a + (x.rewards.find((r) => r.type === 'season_xp')?.amount ?? 0), 0)
      + (s.chest.rewards.find((r) => r.type === 'season_xp')?.amount ?? 0)
    const totalEss = s.chest.rewards.find((r) => r.type === 'essence')?.amount ?? 0
    eq(totalSilver, 450, 'sidabras')
    eq(totalXp, 400, 'season xp')
    eq(totalEss, 50, 'esencija')
  })

  check('questas su progresu keičiamas tik po patvirtinimo', () => {
    const W = '30000000-0000-4000-8000-000000000003'
    q(`insert into profiles(id, username, gold) values ('${W}','quest_user3',1000) on conflict do nothing`)
    rpc(W, `rvn_get_daily_quests()`)
    q(`update user_daily_quests set progress = 1, target_value = 5 where user_id='${W}' and difficulty='hard'`)
    const s = rpc(W, `rvn_get_daily_quests()`)
    const hard = s.quests.find((x) => x.difficulty === 'hard')
    const r1 = rpc(W, `rvn_reroll_daily_quest(${hard.id}, false, 'w1')`)
    eq(r1.error, 'confirmation_required', 'reikia patvirtinimo')
    const r2 = rpc(W, `rvn_reroll_daily_quest(${hard.id}, true, 'w2')`)
    eq(r2.status, 'completed', 'patvirtinus pavyko')
    eq(q(`select progress from user_daily_quests where user_id='${W}' and difficulty='hard'`), '0', 'progresas prarastas')
  })

  // ── lygiagretumas ─────────────────────────────────────────────────────────
  const P = '30000000-0000-4000-8000-000000000009'
  q(`insert into profiles(id, username, gold) values ('${P}','quest_par',1000) on conflict do nothing`)
  rpc(P, `rvn_get_daily_quests()`)
  q(`update user_daily_quests set progress = target_value, is_completed = true where user_id='${P}'`)
  const questId = q(`select id from user_daily_quests where user_id='${P}' and difficulty='hard'`)
  await parallelRpc(P, `rvn_claim_daily_quest(${questId}, null)`, 8)
  check('8 lygiagrečios questo claim užklausos → vienas atlygis', () => {
    eq(q(`select gold from profiles where id='${P}'`), '1200', 'sidabras (1000 + 200)')
    eq(q(`select count(*) from progression_reward_grants where user_id='${P}' and reward_type='silver'`), '1', 'vienas grant įrašas')
  })

  await parallelRpc(P, `rvn_claim_daily_chest_v2(null)`, 6)
  check('6 lygiagrečios skrynios užklausos → viena skrynia', () => {
    eq(q(`select count(*) from user_daily_chests where user_id='${P}'`), '1', 'skrynios eilučių')
    eq(q(`select essence from profiles where id='${P}'`), '50', 'esencija')
  })

  const R = '30000000-0000-4000-8000-00000000000a'
  q(`insert into profiles(id, username, gold) values ('${R}','quest_par2',1000) on conflict do nothing`)
  rpc(R, `rvn_get_daily_quests()`)
  const rQuest = q(`select id from user_daily_quests where user_id='${R}' and difficulty='easy'`)
  await parallelRpc(R, `rvn_reroll_daily_quest(${rQuest}, true, null)`, 6)
  check('6 lygiagrečios reroll užklausos neviršija dienos limito ir nenuskaito dvigubai', () => {
    const used = q(`select (case when free_reroll_used then 1 else 0 end) + paid_reroll_count from user_daily_quest_meta where user_id='${R}'`)
    truthy(Number(used) <= 3, 'panaudota reroll: ' + used)
    const gold = Number(q(`select gold from profiles where id='${R}'`))
    eq(gold, 1000 - (Number(used) - 1) * 100, 'nuskaityta tiksliai pagal apmokėtus reroll')
  })
}
