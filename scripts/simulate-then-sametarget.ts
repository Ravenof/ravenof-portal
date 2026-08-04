// ── then + sameTarget testai (Lisarijaus bug'as) ─────────────────────────────
// Paleidimas: npx tsx scripts/simulate-then-sametarget.ts  (npm run game:test:sametarget)
// „Tada" žingsnio checkbox'as „tas pats taikinys" turi NUSVERTI target lauką
// (admin'e jis dažnai lieka default 'selfUnit' → stun/heal krisdavo ant šaltinio).

import {
  createGame, beginTurn, useChampionAbility, P,
  type TutCard, type GameState,
} from '../src/lib/tutorial/engine'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name, extra) }
}

const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]

function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return {
    id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3,
    type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff',
    effect: null, mappings: [], ...over,
  } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))

function freshGame(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 })
  beginTurn(g)
  return g
}
const mkBoard = (card: TutCard) => ({
  uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
  isChampion: false, phase: 0, abilityUsed: false,
}) as never
const findU = (g: GameState, s: 'you' | 'ai', name: string) => P(g, s).units.filter(Boolean).find((u) => u!.card.name === name)

// Lisarijaus 2 fazės skill'ai — TIKSLIAI kaip DB (target: 'selfUnit' then-žingsnyje!)
function mkLisarijus(): TutCard {
  return mkCard({
    name: 'Lisarijus', uid: 'Lisarijus', type: 'champion', attack: 2, health: 9,
    gameplay: { championSkillConfig: { skills: [
      { name: 'Žaibo akordas', mappings: [{ trigger: 'onChampionSkill', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true,
        then: [{ trigger: 'onChampionSkill', effect: 'stun', target: 'selfUnit', value: 2, sameTarget: true, requiresSelection: false }] }] },
      { name: 'Ledo skydas', mappings: [{ trigger: 'onChampionSkill', effect: 'shield', target: 'ownUnit', value: 6, requiresSelection: true,
        then: [{ trigger: 'onChampionSkill', effect: 'heal', target: 'selfUnit', value: 2, sameTarget: true, requiresSelection: false }] }] },
    ] } },
  } as Partial<TutCard> & { name: string })
}
function putChamp(g: GameState, phase: number) {
  const cu = mkBoard(mkLisarijus()) as { isChampion: boolean; phase: number }
  cu.isChampion = true; cu.phase = phase
  g.you.units[0] = cu as never
}

console.log('\n── 1. Žaibo akordas: stun krenta ant PASIRINKTO priešo, NE ant savęs ──')
{
  const g = freshGame()
  putChamp(g, 2)
  g.ai.units[0] = mkBoard(mkCard({ name: 'Auka', uid: 'Auka', attack: 1, health: 8 }))
  const r = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'Auka' } })
  check('skill ok', r.ok, JSON.stringify(r))
  const auka = findU(g, 'ai', 'Auka')! as { hp: number; statuses: Record<string, number | boolean | undefined> }
  const ch = findU(g, 'you', 'Lisarijus')! as { statuses: Record<string, number | boolean | undefined> }
  check('priešas gavo 2 žalos (8→6)', auka.hp === 6, `hp=${auka.hp}`)
  check('priešas APSVAIGINTAS', !!auka.statuses.stunned, JSON.stringify(auka.statuses))
  check('Lisarijus NEapsvaigintas', !ch.statuses.stunned, JSON.stringify(ch.statuses))
}

console.log('\n── 2. Ledo skydas: skydas IR heal PASIRINKTAM padarui ──')
{
  const g = freshGame()
  putChamp(g, 2)
  const dmgd = mkBoard(mkCard({ name: 'Sužeistas', uid: 'Sužeistas', health: 7 })) as { hp: number }
  dmgd.hp = 3  // sužeistas 3/7
  g.you.units[1] = dmgd as never
  const r = useChampionAbility(g, 'you', 1, { target: { kind: 'unit', side: 'you', uid: 'Sužeistas' } })
  check('skill ok', r.ok, JSON.stringify(r))
  const u = findU(g, 'you', 'Sužeistas')! as { hp: number; shield: boolean }
  check('gavo Magišką skydą', !!u.shield)
  check('heal +2 TAM PAČIAM padarui (3→5)', u.hp === 5, `hp=${u.hp}`)
}

console.log('\n── 3. sameTarget nešaudo į žuvusį taikinį (žala nužudė) ──')
{
  const g = freshGame()
  putChamp(g, 2)
  g.ai.units[0] = mkBoard(mkCard({ name: 'Trapus', uid: 'Trapus', attack: 0, health: 2 }))
  const r = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'Trapus' } })
  check('skill ok, taikinys žuvo', r.ok && !findU(g, 'ai', 'Trapus'))
  const ch = findU(g, 'you', 'Lisarijus')! as { statuses: Record<string, unknown> }
  check('Lisarijus vis tiek NEapsvaigintas', !ch.statuses.stunned)
}

console.log('\n── 4. then BE sameTarget: selfUnit toliau reiškia patį šaltinį (senas elgesys) ──')
{
  const g = freshGame()
  putChamp(g, 2)
  const ch0 = findU(g, 'you', 'Lisarijus')! as { hp: number; card: TutCard }
  ch0.hp = 5  // sužeistas čempionas
  ch0.card = { ...ch0.card, gameplay: { championSkillConfig: { skills: [
    { name: 'Smūgis+savigyda', mappings: [{ trigger: 'onChampionSkill', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true,
      then: [{ trigger: 'onChampionSkill', effect: 'heal', target: 'selfUnit', value: 3, requiresSelection: false }] }] },
  ] } } } as TutCard
  g.ai.units[0] = mkBoard(mkCard({ name: 'Auka2', uid: 'Auka2', attack: 0, health: 8 }))
  const r = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'Auka2' } })
  check('skill ok', r.ok, JSON.stringify(r))
  const ch = findU(g, 'you', 'Lisarijus')! as { hp: number }
  check('be sameTarget heal gydo ŠALTINĮ (5→8)', ch.hp === 8, `hp=${ch.hp}`)
  check('priešas negydytas (8−2=6)', (findU(g, 'ai', 'Auka2') as { hp: number } | undefined)?.hp === 6)
}


console.log('\n── 5. Skill aukso kaina: trūksta aukso → atmetama; užtenka → nuskaitoma ──')
{
  const g = freshGame()
  putChamp(g, 2)
  const ch0 = findU(g, 'you', 'Lisarijus')! as { card: TutCard }
  ch0.card = { ...ch0.card, gameplay: { championSkillConfig: { skills: [
    { name: 'Brangus smūgis', goldCost: 300, mappings: [{ trigger: 'onChampionSkill', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true }] },
  ] } } } as TutCard
  g.ai.units[0] = mkBoard(mkCard({ name: 'AukaG', uid: 'AukaG', attack: 0, health: 8 }))
  g.you.gold = 200
  const r1 = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'AukaG' } })
  check('atmesta del aukso', !r1.ok && r1.reason === 'battleLog.err.notEnoughGold', JSON.stringify(r1))
  const chA = findU(g, 'you', 'Lisarijus')! as { abilityUsed: boolean }
  check('gebėjimas NEpanaudotas, auksas nepaliestas', chA.abilityUsed === false && g.you.gold === 200)
  g.you.gold = 1000
  const r2 = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'AukaG' } })
  check('užtenka aukso → ok', r2.ok, JSON.stringify(r2))
  check('auksas nuskaitytas (1000→700)', g.you.gold === 700, `gold=${g.you.gold}`)
  check('efektas įvyko (8→6)', (findU(g, 'ai', 'AukaG') as { hp: number } | undefined)?.hp === 6)
}

console.log('\n── 6. Skill be kainos: nemokamas kaip anksčiau ──')
{
  const g = freshGame()
  putChamp(g, 2)
  g.ai.units[0] = mkBoard(mkCard({ name: 'AukaF', uid: 'AukaF', attack: 0, health: 8 }))
  g.you.gold = 0
  const r = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'AukaF' } })
  check('nemokamas skill veikia su 0 aukso', r.ok, JSON.stringify(r))
  check('auksas nepakitęs (0)', g.you.gold === 0)
}

console.log(`\n════ REZULTATAS: ${pass} praėjo · ${fail} krito ════`)
process.exit(fail === 0 ? 0 : 1)
