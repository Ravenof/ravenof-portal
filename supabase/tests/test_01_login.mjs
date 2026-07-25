// Daily Login — rolling 31 dienų ciklas
export async function run(t) {
  const { q, rpc, check, eq, truthy, parallelRpc } = t
  const U = '10000000-0000-4000-8000-000000000001'
  q(`insert into profiles(id, username, gold, rubies, essence, digital_onboarded_at)
     values ('${U}','login_user',0,0,0, now()) on conflict do nothing`)

  // laiko slinkimas: visus vartotojo claim'us pastumiam per parą atgal
  // eilutes stumiam didėjimo tvarka — kitaip laikinai susidurtų unique (user, claim_date)
  const advanceDay = () => q(`do $$ declare r record; begin
       for r in select ctid from user_login_claims where user_id='${U}' order by claim_date asc loop
         update user_login_claims set claim_date = claim_date - 1 where ctid = r.ctid;
       end loop;
       update user_login_cycles set completed_at = completed_at - interval '1 day'
         where user_id='${U}' and completed_at is not null;
     end $$`)

  check('pradinė būsena: claimableDay = 1, ciklas dar nesukurtas', () => {
    const s = rpc(U, `rvn_get_login_cycle()`)
    eq(s.claimableDay, 1, 'claimableDay')
    eq(s.claimedToday, false, 'claimedToday')
    eq(s.cycleCompleted, false, 'cycleCompleted')
    eq(s.rewards.length, 31, 'atlygių lentelės ilgis')
  })

  check('1 diena duoda 100 Sidabro', () => {
    const r = rpc(U, `rvn_claim_login_reward('k1')`)
    eq(r.status, 'completed', 'status')
    eq(r.claimedDay, 1, 'claimedDay')
    eq(JSON.stringify(r.grantedRewards), JSON.stringify([{ type: 'silver', amount: 100 }]), 'atlygis')
    eq(q(`select gold from profiles where id='${U}'`), '100', 'sidabro balansas')
  })

  check('negalima claiminti du kartus tą pačią UTC parą', () => {
    const r = rpc(U, `rvn_claim_login_reward('k2')`)
    eq(r.error, 'already_claimed_today', 'klaida')
    eq(q(`select gold from profiles where id='${U}'`), '100', 'balansas nepasikeitė')
  })

  check('idempotency key grąžina tą patį atsakymą be antro atlygio', () => {
    const r = rpc(U, `rvn_claim_login_reward('k1')`)
    eq(r.claimedDay, 1, 'claimedDay')
    eq(q(`select gold from profiles where id='${U}'`), '100', 'balansas nepasikeitė')
  })

  check('praleista diena NEresetina ciklo (pozicija juda tik atsiėmus)', () => {
    advanceDay(); advanceDay(); advanceDay()   // praleistos 2 paros
    const s = rpc(U, `rvn_get_login_cycle()`)
    eq(s.cyclePosition, 1, 'pozicija liko 1')
    eq(s.claimableDay, 2, 'sekanti diena = 2')
    const r = rpc(U, `rvn_claim_login_reward('k3')`)
    eq(r.claimedDay, 2, 'claimedDay')
    eq(q(`select essence from profiles where id='${U}'`), '25', 'esencija po 2 dienos')
  })

  check('7 diena sukuria frakcijos boosterio pasirinkimą (neduoda automatiškai)', () => {
    for (let d = 3; d <= 7; d++) { advanceDay(); rpc(U, `rvn_claim_login_reward('d${d}')`) }
    const s = rpc(U, `rvn_get_login_cycle()`)
    eq(s.cyclePosition, 7, 'pozicija')
    eq(s.pendingChoices.length, 1, 'laukiančių pasirinkimų')
    eq(s.pendingChoices[0].choiceType, 'faction_booster', 'pasirinkimo tipas')
    eq(s.pendingChoices[0].options.length, 8, 'pasirenkamų frakcijų kiekis')
    eq(q(`select count(*) from user_collections where user_id='${U}'`), '0', 'kortos dar neduotos')
  })

  check('boosterio pasirinkimas išduoda 10 kortų', () => {
    const s = rpc(U, `rvn_get_login_cycle()`)
    const c = s.pendingChoices[0]
    const fid = c.options[0].factionId
    const r = rpc(U, `rvn_resolve_faction_booster_choice('${c.choiceId}'::uuid, ${fid}, 'b7')`)
    eq(r.status, 'completed', 'status')
    eq(r.booster.cards.length, 10, 'kortų kiekis')
    eq(r.pendingChoices.length, 0, 'pasirinkimų nebeliko')
  })

  check('21 diena sukuria Rare kortos pasirinkimą (1 Light + 1 Dark)', () => {
    for (let d = 8; d <= 21; d++) { advanceDay(); rpc(U, `rvn_claim_login_reward('d${d}')`) }
    const s = rpc(U, `rvn_get_login_cycle()`)
    eq(s.cyclePosition, 21, 'pozicija')
    const card = s.pendingChoices.find((c) => c.choiceType === 'card')
    truthy(card, 'kortos pasirinkimas sukurtas')
    eq(card.rarity, 'rare', 'rarity')
    eq(card.options.length, 2, 'variantų kiekis')
    eq(card.options[0].alignment, 'light', 'pirmas – Light')
    eq(card.options[1].alignment, 'dark', 'antras – Dark')
    eq(card.options[0].copyLimit, 2, 'Rare copy limit')
  })

  check('nepriklausantis pool\'ui card_id atmetamas', () => {
    const s2 = rpc(U, `rvn_get_login_cycle()`)
    const c = s2.pendingChoices.find((x) => x.choiceType === 'card')
    const inPool = c.options.map((o) => o.cardId)
    const foreign = q(`select id from cards where id not in ('${inPool.join("','")}') limit 1`)
    const r = rpc(U, `rvn_resolve_card_choice('${c.choiceId}'::uuid, '${foreign}'::uuid, 'bad1')`)
    eq(r.error, 'card_not_in_pool', 'klaida')
  })

  check('kortos pasirinkimas prideda kortą į kolekciją', () => {
    const s = rpc(U, `rvn_get_login_cycle()`)
    const c = s.pendingChoices.find((x) => x.choiceType === 'card')
    const before = Number(q(`select coalesce(sum(quantity),0) from user_collections where user_id='${U}'`))
    const r = rpc(U, `rvn_resolve_card_choice('${c.choiceId}'::uuid, '${c.options[0].cardId}'::uuid, 'c21')`)
    eq(r.status, 'completed', 'status')
    eq(r.compensated, false, 'ne kompensacija')
    eq(Number(q(`select coalesce(sum(quantity),0) from user_collections where user_id='${U}'`)), before + 1, 'kolekcija +1')
  })

  check('31 diena: 2 boosterio pasirinkimai + 200 esencijos, naujas ciklas ne tą pačią parą', () => {
    for (let d = 22; d <= 31; d++) { advanceDay(); rpc(U, `rvn_claim_login_reward('d${d}')`) }
    const s = rpc(U, `rvn_get_login_cycle()`)
    eq(s.cyclePosition, 31, 'pozicija')
    eq(s.cycleCompleted, true, 'ciklas užbaigtas')
    eq(s.claimableDay, null, 'šiandien claiminti nebegalima')
    truthy(s.nextClaimAt, 'nurodytas kito claim laikas')
    const boosters = s.pendingChoices.filter((c) => c.choiceType === 'faction_booster' && c.sourceId.endsWith(':day:31'))
    eq(boosters.length, 2, 'du boosterio pasirinkimai iš 31 dienos')
    eq(q(`select essence from profiles where id='${U}'`) > '0', true, 'esencija priskaityta')
    // tą pačią parą naujas ciklas neprasideda
    const r = rpc(U, `rvn_claim_login_reward('after31')`)
    truthy(['already_claimed_today','cycle_completed_today'].includes(r.error), 'claim blokuojamas: ' + r.error)
    eq(q(`select count(*) from user_login_cycles where user_id='${U}'`), '1', 'ciklų kiekis')
    // atskiras kelias: ciklas užbaigtas šiandien, bet šiandienos claim'as „ištrintas"
    q(`update user_login_claims set claim_date = claim_date + 1 where user_id='${U}' and day_number = 31`)
    const r2 = rpc(U, `rvn_claim_login_reward('after31b')`)
    eq(r2.error, 'cycle_completed_today', 'ciklas užbaigtas šiandien')
    q(`update user_login_claims set claim_date = claim_date - 1 where user_id='${U}' and day_number = 31`)
  })

  check('kitą UTC parą prasideda naujas ciklas nuo 1 dienos', () => {
    advanceDay()
    const s = rpc(U, `rvn_get_login_cycle()`)
    eq(s.claimableDay, 1, 'claimableDay')
    eq(s.cycleCompleted, false, 'nebeblokuojama')
    const r = rpc(U, `rvn_claim_login_reward('n1')`)
    eq(r.claimedDay, 1, 'claimedDay')
    eq(q(`select count(*) from user_login_cycles where user_id='${U}'`), '2', 'sukurtas 2-as ciklas')
  })

  check('du boosterio pasirinkimai gali būti tos pačios frakcijos ir sprendžiami atskirai', () => {
    const s = rpc(U, `rvn_get_login_cycle()`)
    const bs = s.pendingChoices.filter((c) => c.choiceType === 'faction_booster' && c.sourceId.endsWith(':day:31'))
    eq(bs.length, 2, 'du laukiantys iš 31 dienos')
    const fid = bs[0].options[0].factionId
    const r1 = rpc(U, `rvn_resolve_faction_booster_choice('${bs[0].choiceId}'::uuid, ${fid}, 'bb1')`)
    eq(r1.booster.cards.length, 10, 'pirmas boosteris')
    const r2 = rpc(U, `rvn_resolve_faction_booster_choice('${bs[1].choiceId}'::uuid, ${fid}, 'bb2')`)
    eq(r2.booster.cards.length, 10, 'antras boosteris (ta pati frakcija)')
    eq(r2.pendingChoices.filter((c) => c.sourceId.endsWith(':day:31')).length, 0, '31 d. pasirinkimų nebeliko')
    eq(q(`select count(*) from reward_choices where user_id='${U}' and status='resolved' and choice_type='faction_booster'`), '3', 'išspręsti boosteriai')
  })

  // ── lygiagretumas ─────────────────────────────────────────────────────────
  const P = '10000000-0000-4000-8000-000000000009'
  q(`insert into profiles(id, username, gold) values ('${P}','login_par',0) on conflict do nothing`)
  const outs = await parallelRpc(P, `rvn_claim_login_reward(null)`, 8)
  check('8 lygiagrečios login claim užklausos → tik VIENAS atlygis', () => {
    eq(q(`select count(*) from user_login_claims where user_id='${P}'`), '1', 'claim eilučių')
    eq(q(`select gold from profiles where id='${P}'`), '100', 'sidabras')
    eq(q(`select count(*) from user_login_cycles where user_id='${P}'`), '1', 'ciklų')
    const ok = outs.filter((o) => o.includes('"claimedDay": 1') || o.includes('"claimedDay":1')).length
    truthy(ok >= 1, 'bent viena užklausa pavyko')
  })
}
