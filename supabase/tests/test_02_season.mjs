// Season Path v2 — 20 lygių, free + pass, retroaktyvus pass, Claim All
export async function run(t) {
  const { q, rpc, check, eq, truthy } = t
  const U = '20000000-0000-4000-8000-000000000001'
  q(`insert into profiles(id, username, gold, rubies, essence) values ('${U}','season_user',20000,2000,0) on conflict do nothing`)
  const addXp = (n) => q(`select rvn__add_pass_xp('${U}', ${n})`)

  check('konfigūracija: 20 lygių po 1000 XP (20 000 viso)', () => {
    const s = rpc(U, `rvn_get_season_path_v2()`)
    eq(s.levels, 20, 'lygių')
    eq(s.xpPerLevel, 1000, 'XP lygiui')
    eq(s.totalXp, 20000, 'viso XP')
    eq(s.rows.length, 20, 'eilučių')
    eq(s.hasPass, false, 'pass dar nenupirktas')
    truthy(s.passPrice.silver > 0, 'kaina iš serverio konfigūracijos')
  })

  check('nepasiekto lygio claiminti negalima', () => {
    const r = rpc(U, `rvn_claim_season_reward_v2(1, 'free', 's0')`)
    eq(r.error, 'level_not_reached', 'klaida')
  })

  check('free atlygis veikia be pass (1 lygis = 250 Sidabro)', () => {
    addXp(1000)
    const before = Number(q(`select gold from profiles where id='${U}'`))
    const r = rpc(U, `rvn_claim_season_reward_v2(1, 'free', 's1')`)
    eq(r.status, 'completed', 'status')
    eq(JSON.stringify(r.grantedRewards), JSON.stringify([{ type: 'silver', amount: 250 }]), 'atlygis')
    eq(Number(q(`select gold from profiles where id='${U}'`)), before + 250, 'balansas')
  })

  check('to paties lygio antrą kartą claiminti negalima', () => {
    const r = rpc(U, `rvn_claim_season_reward_v2(1, 'free', 's1b')`)
    eq(r.error, 'already_claimed', 'klaida')
  })

  check('premium atlygis be pass neveikia', () => {
    const r = rpc(U, `rvn_claim_season_reward_v2(1, 'pass', 's2')`)
    eq(r.error, 'no_pass', 'klaida')
  })

  check('pass nusipirkus VĖLIAU, anksčiau pasiekti premium atlygiai claimable retroaktyviai', () => {
    addXp(4000)                                        // iš viso 5000 XP → 5 lygis
    const r0 = rpc(U, `rvn_unlock_season_pass_v2('silver', 'p1')`)
    eq(r0.status, 'completed', 'pass nupirktas')
    const beforeEss = Number(q(`select essence from profiles where id='${U}'`))
    const r = rpc(U, `rvn_claim_season_reward_v2(1, 'pass', 's3')`)   // 1 lygis pass = 50 esencijos
    eq(r.status, 'completed', 'status')
    eq(Number(q(`select essence from profiles where id='${U}'`)), beforeEss + 50, 'esencija')
  })

  check('pass antrą kartą nusipirkti negalima', () => {
    const r = rpc(U, `rvn_unlock_season_pass_v2('silver', 'p2')`)
    eq(r.error, 'already_owned', 'klaida')
  })

  check('boosterio atlygis sukuria laukiantį pasirinkimą (5 lygis free)', () => {
    const r = rpc(U, `rvn_claim_season_reward_v2(5, 'free', 's5')`)
    eq(r.status, 'choice_required', 'status')
    eq(r.pendingChoices.length, 1, 'laukiančių')
    eq(r.pendingChoices[0].choiceType, 'faction_booster', 'tipas')
    const fid = r.pendingChoices[0].options[0].factionId
    const rr = rpc(U, `rvn_resolve_faction_booster_choice('${r.pendingChoices[0].choiceId}'::uuid, ${fid}, 'sb5')`)
    eq(rr.booster.cards.length, 10, 'boosteryje kortų')
  })

  check('kortos atlygis sukuria Rare pasirinkimą (7 lygis free)', () => {
    addXp(2000)                                        // iš viso 7000 XP → 7 lygis
    const r = rpc(U, `rvn_claim_season_reward_v2(7, 'free', 's7')`)
    eq(r.status, 'choice_required', 'status')
    const c = r.pendingChoices[0]
    eq(c.choiceType, 'card', 'tipas')
    eq(c.rarity, 'rare', 'rarity')
    eq(c.options.length, 2, 'variantų')
    const alignments = c.options.map((o) => o.alignment).sort().join(',')
    eq(alignments, 'dark,light', '1 Light + 1 Dark')
    rpc(U, `rvn_resolve_card_choice('${c.choiceId}'::uuid, '${c.options[0].cardId}'::uuid, 'sc7')`)
  })

  check('Claim All saugiai sustoja ties pasirinkimu', () => {
    addXp(13000)                                       // 20 000 XP → 20 lygis
    const r = rpc(U, `rvn_claim_all_season_rewards('ca1')`)
    eq(r.status, 'choice_required', 'status')
    truthy(r.pendingChoices.length > 0, 'grąžinta pasirinkimų eilė')
    truthy(r.grantedRewards.length > 0, 'iš karto suteikiami atlygiai išduoti')
    // kol yra laukiančių pasirinkimų, antras Claim All nieko neclaimina
    const before = Number(q(`select count(*) from user_season_reward_claims where user_id='${U}'`))
    const r2 = rpc(U, `rvn_claim_all_season_rewards('ca2')`)
    eq(r2.status, 'choice_required', 'antras kvietimas')
    eq(JSON.stringify(r2.grantedRewards), '[]', 'nieko papildomai neišduota')
    eq(Number(q(`select count(*) from user_season_reward_claims where user_id='${U}'`)), before, 'claim\'ų kiekis nepakito')
  })

  check('po pasirinkimų išsprendimo Claim All tęsiamas iki galo', () => {
    let guard = 0
    while (guard++ < 40) {
      const s = rpc(U, `rvn_get_pending_choices()`)
      if (s.pendingChoices.length === 0) break
      const c = s.pendingChoices[0]
      if (c.choiceType === 'faction_booster') {
        rpc(U, `rvn_resolve_faction_booster_choice('${c.choiceId}'::uuid, ${c.options[0].factionId}, null)`)
      } else {
        rpc(U, `rvn_resolve_card_choice('${c.choiceId}'::uuid, '${c.options[0].cardId}'::uuid, null)`)
      }
      const cont = rpc(U, `rvn_continue_pending_claims(null)`)
      if (cont.status === 'completed') break
    }
    const s = rpc(U, `rvn_get_season_path_v2()`)
    const unclaimedFree = s.rows.filter((r) => r.reached && !r.free.claimed).length
    const unclaimedPass = s.rows.filter((r) => r.reached && !r.pass.claimed).length
    eq(unclaimedFree, 0, 'neliko neatsiimtų free atlygių')
    eq(unclaimedPass, 0, 'neliko neatsiimtų pass atlygių')
  })

  check('20 lygis pass: sezoninis avataras nesukonfigūruotas → GAP, o boosteriai išduoti', () => {
    const gaps = Number(q(`select count(*) from progression_content_gaps where gap_type='season_cosmetic'`))
    truthy(gaps > 0, 'užregistruota turinio spraga')
    const defs = q(`select rewards::text from season_reward_defs where level=20 and track='pass'`)
    truthy(!defs.includes('player_avatar'), 'nesukonfigūruota kosmetika praleista')
    truthy(defs.includes('faction_booster_choice'), 'boosteriai liko')
  })

  check('sezono atlygiai užšaldyti sezonui ir turi economy_version', () => {
    eq(q(`select count(*) from season_reward_defs`), '40', 'apibrėžimų (20 lygių × 2 takeliai)')
    eq(q(`select count(distinct economy_version) from season_reward_defs`), '1', 'viena ekonomikos versija')
  })

  check('Claim All idempotency key nekartoja atlygio', () => {
    const before = Number(q(`select gold from profiles where id='${U}'`))
    rpc(U, `rvn_claim_all_season_rewards('ca1')`)
    eq(Number(q(`select gold from profiles where id='${U}'`)), before, 'balansas nepakito')
  })
}
