// ── Paskutinio noro AoE į SAVO padarus (Skrajūnas Gaggar'as) ─────────────────
// Regresija: mirštantis padaras dar stovi lentoje, todėl jo paties AoE
// pataikydavo į jį patį → mirtis/animacija kartojosi daug kartų.
// Paleidimas: npx tsx scripts/simulate-lastwish-aoe.ts  (npm run game:test:lastwishaoe)

import {
  createGame, beginTurn, gameApi, P,
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
const mkBoard = (card: TutCard) => ({
  uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
  isChampion: false, phase: 0, abilityUsed: false,
}) as never

function freshGame(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 })
  beginTurn(g)
  return g
}
const findU = (g: GameState, s: 'you' | 'ai', name: string) => P(g, s).units.filter(Boolean).find((u) => u!.card.name === name)
const countLog = (g: GameState, t: string, card: string) => g.log.filter((e) => e.t === t && e.cardName === card).length

// Gaggar: DEATHRATTLE — 2 žalos VISIEMS savo padarams
const gaggar = () => mkCard({
  name: 'Gaggaras', uid: 'Gaggaras', attack: 3, health: 4,
  keywords: ['lastwish'],
  mappings: [{ trigger: 'onDeath', effect: 'damage', target: 'allOwnUnits', value: 2, applyToAllTypes: true }],
} as unknown as Partial<TutCard> & { name: string })

console.log('\n── 1. Gaggaras miršta: paskutinis noras suveikia LYGIAI 1 kartą ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(gaggar())
  g.you.units[1] = mkBoard(mkCard({ name: 'Draugas1', uid: 'Draugas1', attack: 1, health: 5 }))
  g.you.units[2] = mkBoard(mkCard({ name: 'Draugas2', uid: 'Draugas2', attack: 1, health: 5 }))
  const gag = findU(g, 'you', 'Gaggaras')!
  gameApi.dealToUnit(g, gag, 'you', 10, 'ai', false)

  check('Gaggaras nuimtas nuo lentos', !findU(g, 'you', 'Gaggaras'))
  check('paskutinis noras užfiksuotas 1×', countLog(g, 'lastwish', 'Gaggaras') === 1, `n=${countLog(g, 'lastwish', 'Gaggaras')}`)
  check('mirties įvykis 1×', countLog(g, 'death', 'Gaggaras') === 1, `n=${countLog(g, 'death', 'Gaggaras')}`)
  check('Draugas1: 5→3 (2 žala vieną kartą)', findU(g, 'you', 'Draugas1')!.hp === 3, `hp=${findU(g, 'you', 'Draugas1')?.hp}`)
  check('Draugas2: 5→3 (2 žala vieną kartą)', findU(g, 'you', 'Draugas2')!.hp === 3, `hp=${findU(g, 'you', 'Draugas2')?.hp}`)
  check('be kaskados stabdžio (chainTooLong)', !g.log.some((e) => e.key === 'battleLog.chainTooLong'))
}

console.log('\n── 2. Grandininė mirtis: AoE užmuša draugą, jo paskutinis noras irgi 1× ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(gaggar())
  const silpnas = mkCard({
    name: 'Silpnas', uid: 'Silpnas', attack: 1, health: 2,
    keywords: ['lastwish'],
    mappings: [{ trigger: 'onDeath', effect: 'damage', target: 'enemyPlayer', value: 3 }],
  } as unknown as Partial<TutCard> & { name: string })
  g.you.units[1] = mkBoard(silpnas)
  const hpBefore = g.ai.hp
  gameApi.dealToUnit(g, findU(g, 'you', 'Gaggaras')!, 'you', 10, 'ai', false)

  check('Silpnas žuvo nuo AoE', !findU(g, 'you', 'Silpnas'))
  check('Silpno paskutinis noras 1×', countLog(g, 'lastwish', 'Silpnas') === 1, `n=${countLog(g, 'lastwish', 'Silpnas')}`)
  check('priešo herojui 3 žalos vieną kartą', g.ai.hp === hpBefore - 3, `hp=${g.ai.hp} (buvo ${hpBefore})`)
}

console.log('\n── 3. Paprastas paskutinis noras (be AoE) nepasikeitė ──')
{
  const g = freshGame()
  const paprastas = mkCard({
    name: 'Paprastas', uid: 'Paprastas', attack: 1, health: 2,
    keywords: ['lastwish'],
    mappings: [{ trigger: 'onDeath', effect: 'drawCards', target: 'self', value: 1 }],
  } as unknown as Partial<TutCard> & { name: string })
  g.you.units[0] = mkBoard(paprastas)
  const hand = g.you.hand.length
  gameApi.dealToUnit(g, findU(g, 'you', 'Paprastas')!, 'you', 9, 'ai', false)
  check('ištraukta lygiai 1 korta', g.you.hand.length === hand + 1, `hand=${g.you.hand.length} (buvo ${hand})`)
  check('paskutinis noras 1×', countLog(g, 'lastwish', 'Paprastas') === 1)
}

console.log(`\n── REZULTATAS: ${pass} pass, ${fail} fail ──\n`)
process.exit(fail ? 1 : 0)
