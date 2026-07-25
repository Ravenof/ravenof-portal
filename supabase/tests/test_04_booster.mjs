// Frakcijos boosteris — 10 kortų, 8+2, garantuotas slotas, duplicate protection
export async function run(t) {
  const { q, json, check, eq, truthy } = t
  const U = '40000000-0000-4000-8000-000000000001'
  q(`insert into profiles(id, username, essence) values ('${U}','booster_user',0) on conflict do nothing`)
  const FID = Number(q(`select id from factions where slug='demonu-orda'`))
  const UNI = Number(q(`select id from factions where slug='universalus'`))
  const gen = (uid = U, fid = FID) =>
    json(`select rvn__generate_faction_booster('${uid}', ${fid}, 'test', 'b-' || gen_random_uuid()::text)`)

  let last = null
  check('boosteryje lygiai 10 kortų', () => {
    last = gen()
    eq(last.cards.length, 10, 'kortų kiekis')
    eq(last.factionId, FID, 'frakcija')
  })

  check('lygiai 8 pasirinktos frakcijos + 2 Universalus kortos', () => {
    const fac = last.cards.filter((c) => c.factionId === FID).length
    const uni = last.cards.filter((c) => c.factionId === UNI).length
    eq(fac, 8, 'frakcijos kortų')
    eq(uni, 2, 'universalių kortų')
  })

  check('slotai 1–6 Common+, 7–9 Magic+, 10 Rare+', () => {
    const order = { common: 1, magic: 2, rare: 3, epic: 4, legendary: 5 }
    for (const c of last.cards) {
      const s = order[c.rarity]
      if (c.slot <= 6) truthy(s >= 1, `slotas ${c.slot} (${c.rarity})`)
      else if (c.slot <= 9) truthy(s >= 2, `slotas ${c.slot} turi būti Magic+, gauta ${c.rarity}`)
      else truthy(s >= 3, `slotas 10 turi būti Rare+, gauta ${c.rarity}`)
    }
  })

  check('10-as slotas — garantuotai pasirinktos frakcijos Rare+ korta', () => {
    for (let i = 0; i < 15; i++) {
      const b = gen()
      const s10 = b.cards.find((c) => c.slot === 10)
      eq(s10.factionId, FID, '10-o sloto frakcija')
      truthy(['rare', 'epic', 'legendary'].includes(s10.rarity), '10-o sloto rarity: ' + s10.rarity)
    }
  })

  check('kolekcija atnaujinama transakciškai (kiekviena korta – 1 vienetas)', () => {
    const V = '40000000-0000-4000-8000-000000000002'
    q(`insert into profiles(id, username) values ('${V}','booster_user2') on conflict do nothing`)
    const b = gen(V)
    const drawn = b.cards.filter((c) => c.cardId)
    const total = Number(q(`select coalesce(sum(quantity),0) from user_collections where user_id='${V}'`))
    eq(total, drawn.length, 'kolekcijos vienetų')
    eq(q(`select count(*) from progression_reward_grants where user_id='${V}' and reward_type='card'`),
       String(drawn.length), 'audit log įrašų')
  })

  check('nė viena korta neviršija copy limit', () => {
    const over = q(`select count(*) from user_collections uc
      join cards c on c.id = uc.card_id join rarities r on r.id = c.rarity_id
      where uc.user_id='${U}' and uc.quantity > r.copy_limit`)
    eq(over, '0', 'viršijančių copy limit')
  })

  check('duplicate protection: turint viską iki copy limit — esencijos kompensacija', () => {
    const W = '40000000-0000-4000-8000-000000000003'
    q(`insert into profiles(id, username, essence) values ('${W}','booster_full',0) on conflict do nothing`)
    // pripildom VISAS pasirinktos frakcijos ir Universalus kortas iki copy limit
    q(`insert into user_collections(user_id, card_id, quantity)
       select '${W}', c.id, r.copy_limit from cards c join rarities r on r.id=c.rarity_id
       where c.status='active' and c.faction_id in (${FID}, ${UNI})
       on conflict (user_id, card_id) do update set quantity = excluded.quantity`)
    const b = gen(W)
    eq(b.cards.filter((c) => c.compensated).length, 10, 'visos 10 kompensuotos')
    truthy(b.essenceCompensation > 0, 'esencijos kompensacija: ' + b.essenceCompensation)
    eq(Number(q(`select essence from profiles where id='${W}'`)), b.essenceCompensation, 'esencija priskaityta')
    eq(q(`select count(*) from progression_reward_grants where user_id='${W}' and reward_type='essence_compensation'`), '1', 'audit įrašas')
  })

  check('kompensacijos dydis imamas iš esamos craft.disenchant lentelės', () => {
    const cfg = json(`select value from economy_config where key='craft'`)
    for (const [tier, val] of Object.entries(cfg.disenchant)) {
      eq(q(`select rvn__duplicate_essence(${tier})`), String(val), `tier ${tier}`)
    }
  })

  check('nepasirenkamos frakcijos (Universalus) boosterio gauti negalima', () => {
    const r = json(`select rvn__generate_faction_booster('${U}', ${UNI}, 'test', 'bad')`)
    eq(r.error, 'faction_not_selectable', 'klaida')
  })

  check('pasirenkamos frakcijos — lygiai 8 (4 Light + 4 Dark), be Universalus', () => {
    eq(q(`select count(*) from rvn__selectable_factions()`), '8', 'kiekis')
    eq(q(`select count(*) from rvn__selectable_factions() where alignment='light'`), '4', 'light')
    eq(q(`select count(*) from rvn__selectable_factions() where alignment='dark'`), '4', 'dark')
    eq(q(`select count(*) from rvn__selectable_factions() where slug='universalus'`), '0', 'be Universalus')
  })

  check('kortos pasirinkimo pool: rare/epic/legendary copy limit 2/1/1', () => {
    for (const [code, limit] of [['rare', 2], ['epic', 1], ['legendary', 1]]) {
      const pool = json(`select rvn__build_card_choice_pool('${U}', '${code}')`)
      eq(pool.length, 2, `${code} variantų`)
      eq(pool.map((o) => o.alignment).sort().join(','), 'dark,light', `${code} 1 Light + 1 Dark`)
      eq(pool[0].copyLimit, limit, `${code} copy limit`)
      eq(pool[0].rarity, code, `${code} rarity kodas`)
      truthy(pool[0].nameEn && pool[0].nameLt, 'LT ir EN pavadinimai')
      truthy(typeof pool[0].duplicateEssence === 'number', 'duplicateEssence')
    }
  })

  check('pasiekus copy limit, kortos variantas pažymimas disabled', () => {
    const pool = json(`select rvn__build_card_choice_pool('${U}', 'rare')`)
    const cid = pool[0].cardId
    q(`insert into user_collections(user_id, card_id, quantity) values ('${U}','${cid}',2)
       on conflict (user_id, card_id) do update set quantity = 2`)
    const pool2 = json(`select rvn__card_choice_option('${U}', '${cid}')`)
    eq(pool2.disabled, true, 'disabled')
    eq(pool2.ownedCount, 2, 'ownedCount')
  })
}
