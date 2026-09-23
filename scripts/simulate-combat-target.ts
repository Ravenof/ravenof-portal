// ── Kovos taikinio kanonas: onAttack / onAttacked / onAfterAttack efektai ─────
// Paleidimas: npm run game:test:combattarget
// Klaida (2026-09-23): „atakuoju, o nuodai/stun krenta kitam atsitiktiniam padarui" —
// be `useAttackTarget`+`requiresSelection` kovos taikinys būdavo ignoruojamas.
// Kanonas: vieno taikinio efektas be rankinio pasirinkimo / targetSelect /
// allowRandomTarget → kovos taikinys, jei jis patenka į mapping'o aibę.

import { createGame, beginTurn, attack, P, setSceneGatesEnabled, type TutCard, type GameState } from '../src/lib/tutorial/engine'
import type { EffectMapping } from '../src/lib/game/types'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗ FAIL:', name, extra) } }
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 1, health: 3, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))
function freshGame(): GameState { const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 }); beginTurn(g); g.reactionGates = null; return g }
const mkUnit = (c: TutCard, hp = 9) => ({ uid: c.uid, card: c, atk: c.attack ?? 1, hp, maxHp: hp, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false })
const unit = (g: GameState, s: 'you' | 'ai', uid: string) => P(g, s).units.find((u) => u?.uid === uid)
setSceneGatesEnabled(false)

// Kartojam po 12 kartų, nes senoji klaida buvo ATSITIKTINĖ (auto-pick)
const REP = 12

console.log('\n── 1. onAttack poison (be useAttackTarget, be requiresSelection) → nuodai ATAKUOTAM ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = freshGame()
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Nuodytojas', uid: 'p1', attack: 1, mappings: [{ trigger: 'onAttack', effect: 'poison', target: 'enemyUnit', requiresSelection: false } as EffectMapping] })) as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'A', uid: 'a1', attack: 0 })) as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'B', uid: 'b1', attack: 0 })) as never
    P(g, 'ai').units[2] = mkUnit(mkCard({ name: 'C', uid: 'c1', attack: 0 })) as never
    attack(g, 'you', 'p1', { kind: 'unit', side: 'ai', uid: 'b1' })
    if (unit(g, 'ai', 'b1')?.statuses.poisoned && !unit(g, 'ai', 'a1')?.statuses.poisoned && !unit(g, 'ai', 'c1')?.statuses.poisoned) ok++
  }
  check(`nuodai visada ant B (${ok}/${REP})`, ok === REP)
}

console.log('\n── 2. onAttack stun su useAttackTarget (requiresSelection false) → stun ATAKUOTAM ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = freshGame()
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Svaigintojas', uid: 's1', attack: 1, mappings: [{ trigger: 'onAttack', effect: 'stun', target: 'enemyUnit', useAttackTarget: true, requiresSelection: false } as EffectMapping] })) as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'A', uid: 'a1', attack: 0 })) as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'B', uid: 'b1', attack: 0 })) as never
    attack(g, 'you', 's1', { kind: 'unit', side: 'ai', uid: 'a1' })
    if (unit(g, 'ai', 'a1')?.statuses.stunned && !unit(g, 'ai', 'b1')?.statuses.stunned) ok++
  }
  check(`stun visada ant A (${ok}/${REP})`, ok === REP)
}

console.log('\n── 3. onAttacked (gynėjo) freeze → sušaldomas ATAKUOTOJAS ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = freshGame()
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'p1', attack: 1 })) as never
    P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Kitas', uid: 'k1', attack: 1 })) as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Ledinis', uid: 'l1', attack: 0, mappings: [{ trigger: 'onAttacked', effect: 'freeze', target: 'enemyUnit', requiresSelection: false } as EffectMapping] })) as never
    attack(g, 'you', 'p1', { kind: 'unit', side: 'ai', uid: 'l1' })
    if (unit(g, 'you', 'p1')?.statuses.frozen && !unit(g, 'you', 'k1')?.statuses.frozen) ok++
  }
  check(`freeze visada ant puolėjo (${ok}/${REP})`, ok === REP)
}

console.log('\n── 4. onAfterAttack damage → papildoma žala ATAKUOTAM ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = freshGame()
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Dvigubas', uid: 'd1', attack: 1, mappings: [{ trigger: 'onAfterAttack', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: false, triggersZmk: false } as EffectMapping] })) as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'A', uid: 'a1', attack: 0 })) as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'B', uid: 'b1', attack: 0 })) as never
    attack(g, 'you', 'd1', { kind: 'unit', side: 'ai', uid: 'b1' })
    if (unit(g, 'ai', 'b1')!.hp === 9 - 1 - 2 && unit(g, 'ai', 'a1')!.hp === 9) ok++
  }
  check(`papildoma žala visada B (${ok}/${REP})`, ok === REP)
}

console.log('\n── 5. Taikinys ne aibėje (onAttack heal ownUnit) → kovos taikinys IGNORUOJAMAS, gydomas savas ──')
{
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Gydytojas', uid: 'h1', attack: 1, mappings: [{ trigger: 'onAttack', effect: 'heal', target: 'ownUnit', value: 2, requiresSelection: false } as EffectMapping] }), 9) as never
  const wounded = mkUnit(mkCard({ name: 'Suzeistas', uid: 'w1', attack: 1 }), 9); wounded.hp = 5
  P(g, 'you').units[1] = wounded as never
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'A', uid: 'a1', attack: 0 })) as never
  attack(g, 'you', 'h1', { kind: 'unit', side: 'ai', uid: 'a1' })
  check('priešas negydomas, savas sužeistas pagydytas', unit(g, 'ai', 'a1')!.hp === 8 && unit(g, 'you', 'w1')!.hp === 7, `a1=${unit(g, 'ai', 'a1')!.hp} w1=${unit(g, 'you', 'w1')!.hp}`)
}

console.log('\n── 6. allowRandomTarget → kanonas netaikomas (lieka atsitiktinis) ──')
{
  const seen = new Set<string>()
  for (let r = 0; r < 40; r++) {
    const g = freshGame()
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Chaosas', uid: 'c1', attack: 1, mappings: [{ trigger: 'onAttack', effect: 'poison', target: 'enemyUnit', allowRandomTarget: true, requiresSelection: false } as EffectMapping] })) as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'A', uid: 'a1', attack: 0 })) as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'B', uid: 'b1', attack: 0 })) as never
    attack(g, 'you', 'c1', { kind: 'unit', side: 'ai', uid: 'a1' })
    if (unit(g, 'ai', 'a1')?.statuses.poisoned) seen.add('a'); if (unit(g, 'ai', 'b1')?.statuses.poisoned) seen.add('b')
  }
  check('per 40 kartų nuodai kliuvo abiem (atsitiktinumas išlaikytas)', seen.size === 2, [...seen].join(','))
}

console.log('\n──────────────')
console.log(`  PASS: ${pass}   FAIL: ${fail}`)
console.log('──────────────')
if (fail > 0) process.exit(1)
