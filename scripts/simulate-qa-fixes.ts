// ── QA 2026-08-16 fix'ų regresijos ───────────────────────────────────────────
// Paleidimas: npm run game:test:qa
// #1: swapPerspective apverčia log key/params puses (PvP svečio „Tu/Priešininkas").
// #2: burtas be legalaus taikinio NEsužaidžiamas (auksas/korta nepaliesti).

import { createGame, beginTurn, playCard, swapPerspective, resolveChoice, resolvePendingLastwish, P, type TutCard, type GameState } from '../src/lib/tutorial/engine'
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

console.log('\n◆ Elementų kamuoliai — chooseAlt su rankiniais taikiniais (commit618)')
const kamuoliai = (): TutCard => mkCard({ name: 'Elementu kamuoliai', uid: 'ek', type: 'spell', mappings: [{
  sound: 'impact', value: 4, effect: 'damage', target: 'enemyUnit', trigger: 'onPlay', hitCount: 2, projectile: 'fireball',
  targetTypes: ['anyUnit', 'anyArtifact', 'anyChampion'], requiresSelection: true, note: '2 taikiniai lauke po -4',
  chooseAlt: [{ sound: 'impact', value: 6, effect: 'damage', target: 'enemyPlayer', trigger: 'onPlay', projectile: 'fireball', requiresSelection: false, note: '-6 priešo žaidėjui' }],
} as EffectMapping] })
const mkU = (card: TutCard, uid: string) => ({ uid, card, atk: card.attack ?? 2, hp: card.health ?? 3, maxHp: card.health ?? 3, shield: false, stealth: false, statuses: {}, summonedOnTurn: 0, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false })
function ekGame(): GameState {
  const g = createGame(filler(20, 'Y'), filler(20, 'A'), 'you', { zmkDefs: ZMK0 as never })
  beginTurn(g)
  g.you.gold = 1000
  g.ai.units[0] = mkU(mkCard({ name: 'E1', uid: 'e1', health: 6 }), 'e1') as GameState['you']['units'][0]
  g.ai.units[1] = mkU(mkCard({ name: 'E2', uid: 'e2', health: 6 }), 'e2') as GameState['you']['units'][0]
  g.you.hand.push(kamuoliai())
  return g
}
{
  const g = ekGame()
  const r = playCard(g, 'you', 'ek')
  check('burtas sužaistas be išankstinio taikinio (chooseAlt pop-up)', r.ok && !!g.pendingChoice, JSON.stringify({ ok: r.ok, pc: !!g.pendingChoice }))
  check('pop-up su 2 variantais', g.pendingChoice?.options.length === 2, String(g.pendingChoice?.options.length))
  resolveChoice(g, 0)
  check('A šaka: taikiniai NEparinkti automatiškai — laukiama žaidėjo (pendingLastwish)', !!g.pendingLastwish && P(g, 'ai').units.every((u) => !u || u.hp === 6), JSON.stringify({ pl: !!g.pendingLastwish, hp: P(g, 'ai').units.filter(Boolean).map((u) => u!.hp) }))
  const r2 = resolvePendingLastwish(g, [{ kind: 'unit', side: 'ai', uid: 'e1' }, { kind: 'unit', side: 'ai', uid: 'e2' }])
  check('2 pasirinkti taikiniai gavo po 4 (6,6 → 2,2)', r2.ok && P(g, 'ai').units.filter(Boolean).map((u) => u!.hp).join(',') === '2,2', P(g, 'ai').units.filter(Boolean).map((u) => u!.hp).join(','))
  check('pendingLastwish išspręstas', !g.pendingLastwish)
  check('žaidėjas žalos negavo (A šaka tik laukas)', g.ai.hp === g.ai.maxHp, String(g.ai.hp))
}
{
  const g = ekGame()
  playCard(g, 'you', 'ek')
  resolveChoice(g, 1)
  check('B šaka: -6 priešo žaidėjui iškart, be taikinio pasirinkimo', g.ai.hp === g.ai.maxHp - 6 && !g.pendingLastwish, `hp=${g.ai.hp}/${g.ai.maxHp} pl=${!!g.pendingLastwish}`)
  check('B šaka: padarai nepaliesti', P(g, 'ai').units.filter(Boolean).every((u) => u!.hp === 6))
}
{
  // AI žaidžia → 1-a šaka auto taikiniais (esamas chooseAlt kanonas)
  const g = createGame(filler(20, 'Y'), filler(20, 'A'), 'ai', { zmkDefs: ZMK0 as never })
  beginTurn(g)
  g.ai.gold = 1000
  g.you.units[0] = mkU(mkCard({ name: 'M1', uid: 'm1', health: 6 }), 'm1') as GameState['you']['units'][0]
  g.you.units[1] = mkU(mkCard({ name: 'M2', uid: 'm2', health: 6 }), 'm2') as GameState['you']['units'][0]
  const ek = kamuoliai(); g.ai.hand.push(ek)
  playCard(g, 'ai', 'ek')
  const hps = P(g, 'you').units.filter(Boolean).map((u) => u!.hp)
  check('AI: 1-a šaka auto (2 taikiniai po 4, be pending)', !g.pendingChoice && !g.pendingLastwish && hps.filter((h) => h === 2).length >= 1, JSON.stringify(hps))
}

console.log(`\n${pass} ✓ / ${fail} ✗`)
process.exit(fail ? 1 : 0)
