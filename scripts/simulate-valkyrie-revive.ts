// ── Valkirija: „Kai sunaikina priešininko padarą, prikelia jį savo pusėje su 1/1" ──
// onDestroy + revive + reviveDestroyedTarget (+ reviveAtk/reviveHp).
// Paleidimas: npx tsx scripts/simulate-valkyrie-revive.ts  (npm run game:test:valkyrie)

import {
  createGame, beginTurn, attack, P,
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
const units = (g: GameState, s: 'you' | 'ai') => P(g, s).units.filter(Boolean)

// Tiksliai kaip prod DB (BASE-010) + nauji statų laukai
const valk = (stats = true) => mkCard({
  name: 'Valkirija', uid: 'Valkirija', attack: 4, health: 4,
  mappings: [{ value: 1, effect: 'revive', target: 'enemyUnit', trigger: 'onDestroy', requiresSelection: true, reviveDestroyedTarget: true, ...(stats ? { reviveAtk: 1, reviveHp: 1 } : {}) }],
} as Partial<TutCard> & { name: string })

console.log('\n── 1. Valkirija puola ir užmuša vienintelį priešo padarą → jis prikeliamas jos pusėje 1/1 ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(valk())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Goblinas', uid: 'Goblinas', attack: 2, health: 3 }))
  const r = attack(g, 'you', 'Valkirija', { kind: 'unit', side: 'ai', uid: 'Goblinas' })
  check('ataka ok', r.ok, JSON.stringify(r))
  const mine = units(g, 'you').find((u) => u!.card.name === 'Goblinas')
  check('Goblinas dabar tavo pusėje', !!mine)
  check('statai 1/1', mine?.atk === 1 && mine?.hp === 1 && mine?.maxHp === 1, `${mine?.atk}/${mine?.hp}`)
  check('priešo pusėje jo nebėra', !units(g, 'ai').some((u) => u!.card.name === 'Goblinas'))
  check('kapinynuose jo nebėra', !P(g, 'ai').discard.some((c) => c.uid === 'Goblinas') && !P(g, 'you').discard.some((c) => c.uid === 'Goblinas'))
  check('Valkirija gyva (4→2)', units(g, 'you').find((u) => u!.card.name === 'Valkirija')?.hp === 2)
}

console.log('\n── 2. Priešas NEžūva → nieko neprikeliama ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(valk())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Storas', uid: 'Storas', attack: 1, health: 10 }))
  attack(g, 'you', 'Valkirija', { kind: 'unit', side: 'ai', uid: 'Storas' })
  check('tavo pusėje tik Valkirija', units(g, 'you').length === 1)
}

console.log('\n── 3. Abu žūva (Valkirija 4/4 vs 5/4) → Valkirija mirusi, prikėlimo nėra ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(valk())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Riteris', uid: 'Riteris', attack: 5, health: 4 }))
  attack(g, 'you', 'Valkirija', { kind: 'unit', side: 'ai', uid: 'Riteris' })
  check('Riteris kapinyne (neprikeltas)', P(g, 'ai').discard.some((c) => c.uid === 'Riteris'))
  check('tavo lenta tuščia', units(g, 'you').length === 0)
}

console.log('\n── 4. Priešas turi kitų padarų → prikeliamas BŪTENT užmuštas, ne kitas ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(valk())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Auka', uid: 'Auka', attack: 1, health: 2 }))
  g.ai.units[1] = mkBoard(mkCard({ name: 'Kitas', uid: 'Kitas', attack: 1, health: 5 }))
  attack(g, 'you', 'Valkirija', { kind: 'unit', side: 'ai', uid: 'Auka' })
  check('Auka tavo pusėje', units(g, 'you').some((u) => u!.card.name === 'Auka'))
  check('Kitas lieka priešo pusėje', units(g, 'ai').some((u) => u!.card.name === 'Kitas'))
}

console.log('\n── 5. Be reviveAtk/Hp (sena konfigūracija) → prikeliama su baziniais statais ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(valk(false))
  g.ai.units[0] = mkBoard(mkCard({ name: 'Goblinas2', uid: 'Goblinas2', attack: 2, health: 3 }))
  attack(g, 'you', 'Valkirija', { kind: 'unit', side: 'ai', uid: 'Goblinas2' })
  const mine = units(g, 'you').find((u) => u!.card.name === 'Goblinas2')
  check('prikeltas su 2/3', mine?.atk === 2 && mine?.hp === 3, `${mine?.atk}/${mine?.hp}`)
}

console.log(`\n${pass} ok, ${fail} fail`)
if (fail > 0) process.exit(1)
