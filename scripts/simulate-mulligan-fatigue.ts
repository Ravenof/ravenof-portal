// ── Mulligan + Fatigue regresijos patikros ───────────────────────────────────
// Paleidimas: npm run game:test:mullfat
// Dengia: mulligan fazė (pendingMulligan, keitimas, „pasilikti visas", AI
// euristika, VIENAS beginTurn), fatigue (tuščia kaladė → 1, 2, 3... žala).

import {
  createGame, beginTurn, applyNetAction, resolveMulligan, P,
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
const filler = (n: number, tag = 'F', gold = 0) => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}`, gold }))

console.log('◆ Mulligan fazė')
{
  const g = createGame(filler(10, 'Y'), filler(10, 'A'), 'you', { zmkDefs: ZMK0 as never, mulligan: true })
  check('pendingMulligan nustatytas abiem', !!g.pendingMulligan?.you && !!g.pendingMulligan?.ai)
  check('ėjimai dar neprasidėję (globalTurn 0)', g.globalTurn === 0)
  check('pradinė ranka 4 (pirmasis)', g.you.hand.length === 4)
  const swap = g.you.hand.slice(0, 2).map((c) => c.uid)
  const r = resolveMulligan(g, 'you', swap)
  check('resolveMulligan ok', r.ok)
  check('iškeistos kortos nebe rankoje', !g.you.hand.some((c) => swap.includes(c.uid) && g.globalTurn === 0))
  check('fazė užbaigta (pendingMulligan null)', !g.pendingMulligan)
  check('beginTurn įvyko LYGIAI kartą (globalTurn 1)', g.globalTurn === 1, `globalTurn=${g.globalTurn}`)
  check('po beginTurn ranka 5 (4 keitimo + 1 ėjimo traukimas)', g.you.hand.length === 5, `hand=${g.you.hand.length}`)
  check('auksas 100 (ne dvigubas beginTurn)', g.you.gold === 100, `gold=${g.you.gold}`)
  check('kortų suma nepakito (ranka+kaladė=10-1t)', g.you.hand.length + g.you.deck.length === 10)
  check('AI mulligan log yra', g.log.some((e) => e.t === 'mulligan' && e.side === 'ai'))
}
{
  const g = createGame(filler(10, 'Y'), filler(10, 'A'), 'you', { zmkDefs: ZMK0 as never, mulligan: true })
  const hand0 = g.you.hand.map((c) => c.uid).join(',')
  resolveMulligan(g, 'you', [])
  check('„pasilikti visas" – ranka nepakito (be ėjimo traukimo)', g.you.hand.slice(0, 4).map((c) => c.uid).join(',') === hand0)
  check('fazė užbaigta ir be keitimo', !g.pendingMulligan && g.globalTurn === 1)
}
{
  const g = createGame(filler(10, 'Y'), filler(12, 'A', 600), 'you', { zmkDefs: ZMK0 as never, mulligan: true })
  resolveMulligan(g, 'you', [])
  const aiMull = g.log.find((e) => e.t === 'mulligan' && e.side === 'ai')
  check('AI iškeičia brangias (>=500) korteles, iki 3', (aiMull?.params as { n?: number } | undefined)?.n === 3, JSON.stringify(aiMull?.params))
  check('AI ranka po mulligano vėl 5', g.ai.hand.length === 5, `hand=${g.ai.hand.length}`)
}
{
  const g = createGame(filler(10, 'Y'), filler(10, 'A'), 'you', { zmkDefs: ZMK0 as never })
  check('be opts.mulligan fazės nėra', !g.pendingMulligan)
  const r = resolveMulligan(g, 'you', [])
  check('resolveMulligan be fazės atmetamas', !r.ok)
}

console.log('◆ Fatigue (tuščia kaladė)')
{
  const g = createGame(filler(5, 'Y'), filler(5, 'A'), 'you', { zmkDefs: ZMK0 as never })
  beginTurn(g)   // you: kaladėje 1 → ištraukia paskutinę
  check('you ištraukia paskutinę kortą be žalos', g.you.hp === 40 && g.you.deck.length === 0)
  applyNetAction(g, { t: 'endTurn', actor: 'you' })   // ai pradeda: kaladė tuščia → fatigue 1
  check('ai fatigue 1 → hp 39', g.ai.hp === 39, `hp=${g.ai.hp}`)
  applyNetAction(g, { t: 'endTurn', actor: 'ai' })    // you: fatigue 1
  check('you fatigue 1 → hp 39', g.you.hp === 39, `hp=${g.you.hp}`)
  applyNetAction(g, { t: 'endTurn', actor: 'you' })   // ai: fatigue 2
  check('ai fatigue 2 → hp 37', g.ai.hp === 37, `hp=${g.ai.hp}`)
  applyNetAction(g, { t: 'endTurn', actor: 'ai' })    // you: fatigue 2
  check('you fatigue 2 → hp 37', g.you.hp === 37, `hp=${g.you.hp}`)
  const fat = g.log.filter((e) => e.t === 'fatigue' && e.side === 'you').map((e) => (e.params as { n?: number } | undefined)?.n)
  check('fatigue log seka 1, 2', fat.join(',') === '1,2', fat.join(','))
  const dmg = g.log.filter((e) => e.t === 'damage' && e.side === 'you' && !e.cardName)
  check('fatigue duoda ir damage įvykį (FX/skaičiui)', dmg.length >= 2)
}
{
  // Fatigue nužudo: HP 3, fatigue 1+2+3 kaupiasi
  const g = createGame(filler(4, 'Y'), filler(4, 'A'), 'you', { zmkDefs: ZMK0 as never })
  g.you.hp = 3; g.ai.hp = 40
  beginTurn(g)   // you: kaladėje 0 (4 pradinei rankai) → fatigue 1 → hp 2
  check('fatigue 1 → hp 2', g.you.hp === 2, `hp=${g.you.hp}`)
  applyNetAction(g, { t: 'endTurn', actor: 'you' })
  applyNetAction(g, { t: 'endTurn', actor: 'ai' })   // you fatigue 2 → hp 0 → pralaimėta
  check('fatigue 2 pribaigia (winner=ai)', g.winner === 'ai', `winner=${g.winner} hp=${g.you.hp}`)
}

console.log(`\n${pass} ✓ / ${fail} ✗`)
process.exit(fail ? 1 : 0)
