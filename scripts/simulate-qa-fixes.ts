// ── QA 2026-08-16 fix'ų regresijos ───────────────────────────────────────────
// Paleidimas: npm run game:test:qa
// #1: swapPerspective apverčia log key/params puses (PvP svečio „Tu/Priešininkas").
// #2: burtas be legalaus taikinio NEsužaidžiamas (auksas/korta nepaliesti).

import { createGame, beginTurn, playCard, swapPerspective, P, type TutCard, type GameState } from '../src/lib/tutorial/engine'
import type { EffectMapping } from '../src/lib/game/types'

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
  const g = createGame(filler(15, 'Y'), filler(15, 'A'), 'you', { zmkDefs: ZMK0 as never })
  beginTurn(g)
  return g
}

console.log('◆ #1 swapPerspective: log key pusės apverčiamos')
{
  const g = freshGame()
  // dirbtiniai log irasai su puses sufiksais
  g.log.push({ t: 'draw', side: 'you', key: 'battleLog.draw.you' } as never)
  g.log.push({ t: 'gold', side: 'ai', key: 'battleLog.gold.ai' } as never)
  g.log.push({ t: 'blocked', side: 'you', key: 'battleLog.deckEmptyPeek', params: { victim: '$t:battleLog.sideGen.ai' } } as never)
  const sw = swapPerspective(g)
  const l = sw.log
  const draw = l.find((e) => e.t === 'draw' && e.key?.startsWith('battleLog.draw'))
  const gold = l.find((e) => e.t === 'gold' && e.key?.startsWith('battleLog.gold'))
  const blk = l.find((e) => e.t === 'blocked' && e.key === 'battleLog.deckEmptyPeek')
  check('draw.you → draw.ai (svečias mato host traukimą kaip priešo)', draw?.key === 'battleLog.draw.ai' && draw?.side === 'ai', `${draw?.key} side=${draw?.side}`)
  check('gold.ai → gold.you', gold?.key === 'battleLog.gold.you' && gold?.side === 'you', `${gold?.key}`)
  check('params $t: nuorodos apverstos (sideGen.ai → sideGen.you)', (blk?.params as { victim?: string } | undefined)?.victim === '$t:battleLog.sideGen.you', JSON.stringify(blk?.params))
  check('key be pusės sufikso nepaliestas', blk?.key === 'battleLog.deckEmptyPeek')
  // dvigubas swap = originalas
  const back = swapPerspective(sw)
  check('dvigubas swap grąžina originalą', back.log.find((e) => e.t === 'draw' && e.key?.startsWith('battleLog.draw'))?.key === 'battleLog.draw.you')
}

console.log('◆ #2 burtas be taikinio nesužaidžiamas')
{
  const g = freshGame()
  const zaibas = mkCard({ name: 'Zaibo iskrova', uid: 'q1', type: 'spell', gold: 200, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 4, hitCount: 2, requiresSelection: true, triggersZmk: false } as EffectMapping] })
  P(g, 'you').hand.push(zaibas)
  P(g, 'you').gold = 500
  const goldBefore = P(g, 'you').gold
  const handBefore = P(g, 'you').hand.length
  const r = playCard(g, 'you', 'q1')   // priešo lenta TUŠČIA
  check('atmetama su noValidTarget', !r.ok && r.reason === 'battleLog.err.noValidTarget', JSON.stringify(r))
  check('auksas nenuskaičiuotas', P(g, 'you').gold === goldBefore, `gold=${P(g, 'you').gold}`)
  check('korta liko rankoje', P(g, 'you').hand.length === handBefore)
  // atsiradus taikiniui - suzaidziama
  P(g, 'ai').units[0] = { uid: 'e1', card: mkCard({ name: 'E1', uid: 'e1' }), atk: 2, hp: 4, maxHp: 4, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false } as never
  const r2 = playCard(g, 'you', 'q1')
  check('su taikiniu lentoje sužaidžiama', r2.ok, JSON.stringify(r2))
}
{
  // noTargetThen fallback leidžia žaisti ir be taikinių
  const g = freshGame()
  const su = mkCard({ name: 'Su fallback', uid: 'q2', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true, triggersZmk: false, noTargetThen: [{ trigger: 'onCast', effect: 'drawCards', target: 'ownPlayer', value: 1, triggersZmk: false }] } as EffectMapping] })
  P(g, 'you').hand.push(su)
  P(g, 'you').gold = 500
  const r = playCard(g, 'you', 'q2')
  check('noTargetThen fallback – žaidžiama ir be taikinių', r.ok, JSON.stringify(r))
}
{
  // misrus burtas (damage + draw) zaidziamas: bent viena dalis ivyks
  const g = freshGame()
  const mix = mkCard({ name: 'Misrus', uid: 'q3', type: 'spell', gold: 100, mappings: [
    { trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true, triggersZmk: false } as EffectMapping,
    { trigger: 'onCast', effect: 'drawCards', target: 'ownPlayer', value: 1, triggersZmk: false } as EffectMapping,
  ] })
  P(g, 'you').hand.push(mix)
  P(g, 'you').gold = 500
  const r = playCard(g, 'you', 'q3')
  check('mišrus burtas žaidžiamas (utility dalis įvyks)', r.ok, JSON.stringify(r))
}

console.log(`\n${pass} ✓ / ${fail} ✗`)
process.exit(fail ? 1 : 0)
