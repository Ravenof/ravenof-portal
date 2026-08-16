// ── triggerOnSelfTarget (onAnyCast) testai — Elenora Kraujošviesa ────────────
// Paleidimas: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/simulate-spell-selftarget.ts
// Elenora: buff tipo burtas taiko Į JĄ → 3 žala visiems priešo padarams.
import { createGame, beginTurn, playCard, P, type TutCard, type GameState } from '../src/lib/tutorial/engine'
import type { EffectMapping } from '../src/lib/game/types'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))
const mkUnit = (card: TutCard, uid: string) => ({ uid, card, atk: card.attack ?? 2, hp: card.health ?? 3, maxHp: card.health ?? 3, shield: false, stealth: false, statuses: {}, summonedOnTurn: 0, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false })

// Elenoros DB mapping + triggerOnSelfTarget (migracija 20260863)
const eleMap: EffectMapping = { value: 3, effect: 'damage', target: 'allEnemyUnits', trigger: 'onAnyCast', triggerSide: 'own', triggerSpellType: 'buff', triggerOnSelfTarget: true, requiresSelection: false } as EffectMapping
const mkElenora = () => mkCard({ name: 'Elenora', uid: 'elenora', health: 5, mappings: [eleMap] })

const buffSingle = () => mkCard({ name: 'BuffOne', uid: 'buff1', type: 'spell', gameplay: { spellType: 'buff' } as TutCard['gameplay'],
  mappings: [{ trigger: 'onCast', effect: 'buffAttack', target: 'ownUnit', value: 2, requiresSelection: true } as EffectMapping] })
const buffAoe = () => mkCard({ name: 'BuffAll', uid: 'buffall', type: 'spell', gameplay: { spellType: 'buff' } as TutCard['gameplay'],
  mappings: [{ trigger: 'onCast', effect: 'buffAttack', target: 'allOwnUnits', value: 1, requiresSelection: false } as EffectMapping] })
const fireSingle = () => mkCard({ name: 'FireOne', uid: 'fire1', type: 'spell', gameplay: { spellType: 'fire' } as TutCard['gameplay'],
  mappings: [{ trigger: 'onCast', effect: 'heal', target: 'ownUnit', value: 1, requiresSelection: true } as EffectMapping] })

function fresh(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 })
  beginTurn(g)
  g.you.gold = 1000; g.ai.gold = 1000
  g.you.units[0] = mkUnit(mkElenora(), 'elenora-u') as GameState['you']['units'][0]
  g.you.units[1] = mkUnit(mkCard({ name: 'Ally', uid: 'ally' }), 'ally-u') as GameState['you']['units'][0]
  g.ai.units[0] = mkUnit(mkCard({ name: 'E1', uid: 'e1', health: 6 }), 'e1') as GameState['you']['units'][0]
  g.ai.units[1] = mkUnit(mkCard({ name: 'E2', uid: 'e2', health: 6 }), 'e2') as GameState['you']['units'][0]
  return g
}
const enemyHp = (g: GameState) => P(g, 'ai').units.filter(Boolean).map((u) => u!.hp).join(',')

console.log('\n── 1. Buff burtas Į Elenorą → 3 AoE priešams ──')
{
  const g = fresh()
  g.you.hand.push(buffSingle())
  const r = playCard(g, 'you', 'buff1', { target: { kind: 'unit', side: 'you', uid: 'elenora-u' } })
  check('burtas sužaistas', r.ok, JSON.stringify(r))
  check('AoE 3 žala priešams (6,6 → 3,3)', enemyHp(g) === '3,3', enemyHp(g))
}

console.log('\n── 2. Buff burtas Į KITĄ savo padarą → AoE NEsuveikia ──')
{
  const g = fresh()
  g.you.hand.push(buffSingle())
  const r = playCard(g, 'you', 'buff1', { target: { kind: 'unit', side: 'you', uid: 'ally-u' } })
  check('burtas sužaistas', r.ok, JSON.stringify(r))
  check('priešai nepaliesti (6,6)', enemyHp(g) === '6,6', enemyHp(g))
}

console.log('\n── 3. AoE buff (visiems saviems, be rankinio taikinio) → apima ją → AoE suveikia ──')
{
  const g = fresh()
  g.you.hand.push(buffAoe())
  const r = playCard(g, 'you', 'buffall')
  check('burtas sužaistas', r.ok, JSON.stringify(r))
  check('AoE 3 žala priešams (6,6 → 3,3)', enemyHp(g) === '3,3', enemyHp(g))
}

console.log('\n── 4. NE buff tipo burtas Į ją → NEsuveikia (triggerSpellType) ──')
{
  const g = fresh()
  g.you.hand.push(fireSingle())
  const r = playCard(g, 'you', 'fire1', { target: { kind: 'unit', side: 'you', uid: 'elenora-u' } })
  check('burtas sužaistas', r.ok, JSON.stringify(r))
  check('priešai nepaliesti (6,6)', enemyHp(g) === '6,6', enemyHp(g))
}

console.log('\n── 5. PRIEŠO buff burtas → NEsuveikia (triggerSide own) ──')
{
  const g = fresh()
  // priešo ėjimui perjungiam aktyvų
  g.active = 'ai'
  const enemyBuff = mkCard({ name: 'EBuff', uid: 'ebuff', type: 'spell', gameplay: { spellType: 'buff' } as TutCard['gameplay'],
    mappings: [{ trigger: 'onCast', effect: 'buffAttack', target: 'ownUnit', value: 2, requiresSelection: true } as EffectMapping] })
  g.ai.hand.push(enemyBuff)
  const r = playCard(g, 'ai', 'ebuff', { target: { kind: 'unit', side: 'ai', uid: 'e1' } })
  check('priešo burtas sužaistas', r.ok, JSON.stringify(r))
  check('AoE NEsuveikė (priešai 6,6)', enemyHp(g) === '6,6', enemyHp(g))
}

console.log('\n── 6. Nutildyta Elenora → NEsuveikia ──')
{
  const g = fresh()
  P(g, 'you').units[0]!.statuses.silenced = 2
  g.you.hand.push(buffSingle())
  playCard(g, 'you', 'buff1', { target: { kind: 'unit', side: 'you', uid: 'elenora-u' } })
  check('priešai nepaliesti (6,6)', enemyHp(g) === '6,6', enemyHp(g))
}

console.log(`\n──────────────\n  PASS: ${pass}   FAIL: ${fail}\n──────────────`)
process.exit(fail ? 1 : 0)
