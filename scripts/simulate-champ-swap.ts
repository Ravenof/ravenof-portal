// ── Čempiono fazės keitimo testai: žemesnė fazė kaladėje ARBA kapinyne ────────
// Paleidimas: npx tsx scripts/simulate-champ-swap.ts  (npm run game:test:champswap)

import {
  createGame, beginTurn, swapChampionPhase, P,
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
const champ = (name: string, phase: number): TutCard =>
  mkCard({ name, uid: name, type: 'champion', championGroup: 'magai', championPhase: phase } as Partial<TutCard> & { name: string })

console.log('\n── 1. Žemesnė fazė KALADĖJE: mainai su kalade (senas elgesys) ──')
{
  const g = freshGame()
  g.you.hand.push(champ('Magas2', 2))
  g.you.deck.push(champ('Magas1', 1))
  const r = swapChampionPhase(g, 'you', 'Magas2', 1)
  check('swap ok', r.ok, JSON.stringify(r))
  check('žemesnė rankoje', g.you.hand.some((c) => c.uid === 'Magas1'))
  check('aukštesnė kaladėje', g.you.deck.some((c) => c.uid === 'Magas2'))
}

console.log('\n── 2. Žemesnė fazė TIK KAPINYNE: mainai su kapinynu ──')
{
  const g = freshGame()
  g.you.hand.push(champ('Magas2b', 2))
  g.you.discard.push(champ('Magas1b', 1))
  const r = swapChampionPhase(g, 'you', 'Magas2b', 1)
  check('swap iš kapinyno ok', r.ok, JSON.stringify(r))
  check('žemesnė rankoje', g.you.hand.some((c) => c.uid === 'Magas1b'))
  check('aukštesnė KAPINYNE (mainai vietomis)', g.you.discard.some((c) => c.uid === 'Magas2b'))
  check('kaladė nepaliesta', !g.you.deck.some((c) => c.uid === 'Magas2b' || c.uid === 'Magas1b'))
  check('log iš kapinyno', g.log.some((e) => e.key === 'battleLog.championSwapGrave.you'))
}

console.log('\n── 3. Kaladė turi PIRMENYBĘ prieš kapinyną ──')
{
  const g = freshGame()
  g.you.hand.push(champ('Magas2c', 2))
  g.you.deck.push(champ('Magas1c', 1))
  const graveCopy = champ('Magas1cGrave', 1)
  g.you.discard.push(graveCopy)
  const r = swapChampionPhase(g, 'you', 'Magas2c', 1)
  check('swap ok', r.ok)
  check('paimta iš kaladės (kapinynas nepaliestas)', g.you.discard.some((c) => c.uid === 'Magas1cGrave'))
}

console.log('\n── 4. Nėra niekur → klaida kaip anksčiau ──')
{
  const g = freshGame()
  g.you.hand.push(champ('Magas2d', 2))
  const r = swapChampionPhase(g, 'you', 'Magas2d', 1)
  check('atmesta noFamilyPhaseCard', !r.ok && r.reason === 'battleLog.err.noFamilyPhaseCard', JSON.stringify(r))
  check('korta liko rankoje', g.you.hand.some((c) => c.uid === 'Magas2d'))
}

console.log(`\n════ REZULTATAS: ${pass} praėjo · ${fail} krito ════`)
process.exit(fail === 0 ? 0 : 1)
