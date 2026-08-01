// ── extraAttacks.onSummonTurn testai (Kenji: Sprint + puola 2× iškvietimo ėjimą) ──
// Paleidimas: npx tsx scripts/simulate-extra-attacks.ts  (npm run game:test:extraatk)

import {
  createGame, beginTurn, endTurn, playCard, attack, canUnitAttack, P,
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
  g.you.gold = 1000
  g.ai.gold = 1000
  return g
}
const mkBoard = (card: TutCard) => ({
  uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
  isChampion: false, phase: 0, abilityUsed: false,
}) as never
const findU = (g: GameState, s: 'you' | 'ai', name: string) => P(g, s).units.filter(Boolean).find((u) => u!.card.name === name)

// Kenji archetipas: Sprint + iškvietimo ėjimą +1 ataka
const kenji = () => mkCard({
  name: 'Kenji', uid: 'Kenji', attack: 4, health: 6, keywords: ['sprint'],
  gameplay: { extraAttacks: { onSummonTurn: 1 } },
} as Partial<TutCard> & { name: string })

console.log('\n── 1. Iškvietimo ėjimą: Sprint + onSummonTurn=1 → puola 2×, trečia atmetama ──')
{
  const g = freshGame()
  g.you.hand.push(kenji())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Taikinys', uid: 'Taikinys', attack: 0, health: 20 }))
  playCard(g, 'you', 'Kenji')
  const k = findU(g, 'you', 'Kenji')!
  const r1 = attack(g, 'you', k.uid, { kind: 'unit', side: 'ai', uid: 'Taikinys' })
  check('1-a ataka iškart po iškvietimo (Sprint)', r1.ok, JSON.stringify(r1))
  const r2 = attack(g, 'you', k.uid, { kind: 'unit', side: 'ai', uid: 'Taikinys' })
  check('2-a ataka tą patį ėjimą (onSummonTurn)', r2.ok, JSON.stringify(r2))
  check('taikinys gavo 2×4 žalos (20→12)', findU(g, 'ai', 'Taikinys')!.hp === 12, `hp=${findU(g, 'ai', 'Taikinys')?.hp}`)
  const r3 = attack(g, 'you', k.uid, { kind: 'unit', side: 'ai', uid: 'Taikinys' })
  check('3-ia ataka ATMESTA', !r3.ok && r3.reason === 'battleLog.err.alreadyAttacked', JSON.stringify(r3))
}

console.log('\n── 2. KITĄ savo ėjimą: vėl tik 1 ataka ──')
{
  const g = freshGame()
  g.you.hand.push(kenji())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Taikinys2', uid: 'Taikinys2', attack: 0, health: 30 }))
  playCard(g, 'you', 'Kenji')
  const k = findU(g, 'you', 'Kenji')!
  attack(g, 'you', k.uid, { kind: 'unit', side: 'ai', uid: 'Taikinys2' })
  attack(g, 'you', k.uid, { kind: 'unit', side: 'ai', uid: 'Taikinys2' })
  // priešo ėjimas → vėl mano
  endTurn(g); beginTurn(g)  // ai
  endTurn(g); beginTurn(g)  // you
  const r1 = attack(g, 'you', k.uid, { kind: 'unit', side: 'ai', uid: 'Taikinys2' })
  check('kitą ėjimą 1-a ataka ok', r1.ok, JSON.stringify(r1))
  const r2 = attack(g, 'you', k.uid, { kind: 'unit', side: 'ai', uid: 'Taikinys2' })
  check('kitą ėjimą 2-a ataka ATMESTA (onSummonTurn nebegalioja)', !r2.ok && r2.reason === 'battleLog.err.alreadyAttacked', JSON.stringify(r2))
}

console.log('\n── 3. Be Sprint: onSummonTurn nepadeda apeiti iškvietimo negalios ──')
{
  const g = freshGame()
  const noSprint = mkCard({ name: 'Letas', uid: 'Letas', attack: 2, health: 4, gameplay: { extraAttacks: { onSummonTurn: 1 } } } as Partial<TutCard> & { name: string })
  g.you.hand.push(noSprint)
  g.ai.units[0] = mkBoard(mkCard({ name: 'T3', uid: 'T3', attack: 0, health: 10 }))
  playCard(g, 'you', 'Letas')
  const u = findU(g, 'you', 'Letas')!
  const can = canUnitAttack(g, 'you', u)
  check('be Sprint iškvietimo ėjimą pulti negalima', !can.ok && can.reason === 'battleLog.err.summoningSickness', JSON.stringify(can))
}

console.log(`\n════ REZULTATAS: ${pass} praėjo · ${fail} krito ════`)
process.exit(fail === 0 ? 0 : 1)
