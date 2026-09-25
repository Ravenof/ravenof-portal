// ── Kovos taikinio kanonas: onAttack / onAttacked / onAfterAttack efektai ─────
// Paleidimas: npm run game:test:combattarget
// Klaida (2026-09-23): „atakuoju, o nuodai/stun krenta kitam atsitiktiniam padarui" —
// be `useAttackTarget`+`requiresSelection` kovos taikinys būdavo ignoruojamas.
// Kanonas: vieno taikinio efektas be rankinio pasirinkimo / targetSelect /
// allowRandomTarget → kovos taikinys, jei jis patenka į mapping'o aibę.

import { createGame, beginTurn, attack, playCard, P, setSceneGatesEnabled, type TutCard, type GameState } from '../src/lib/tutorial/engine'
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


// ── Reakcijų kanonas: taikinys = tai, kas trigerino (spragos, rastos 2026-09-23) ──
const reactCard = (name: string, uid: string, m: Partial<EffectMapping>) => mkCard({ name, uid, type: 'reaction', mappings: [{ effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: false, triggersZmk: false, ...m } as EffectMapping] })

console.log('\n── 7. Reakcija „kai gaunu žalos" (ataka į žaidėją) → žala PUOLĖJUI, ne kitam ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = freshGame()
    P(g, 'you').reactions[0] = { uid: 'r1', card: reactCard('Kersytojas', 'r1', { trigger: 'onAnyDamage', triggerSide: 'own' }), paid: 0 } as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'p1', attack: 2 })) as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Kitas', uid: 'k1', attack: 0 })) as never
    g.active = 'ai'
    attack(g, 'ai', 'p1', { kind: 'player', side: 'you' })
    if (unit(g, 'ai', 'p1')!.hp === 7 && unit(g, 'ai', 'k1')!.hp === 9) ok++
  }
  check(`žala puolėjui (${ok}/${REP})`, ok === REP)
}

console.log('\n── 8. Reakcija „kai mano padaras žūsta" → žala ŽUDIKUI ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = freshGame()
    P(g, 'you').reactions[0] = { uid: 'r2', card: reactCard('Kraujo skola', 'r2', { trigger: 'onAnyDeath', triggerSide: 'own' }), paid: 0 } as never
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Auka', uid: 'v1', attack: 0 }), 1) as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Zudikas', uid: 'z1', attack: 3 })) as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Kitas', uid: 'k1', attack: 0 })) as never
    g.active = 'ai'
    attack(g, 'ai', 'z1', { kind: 'unit', side: 'you', uid: 'v1' })
    if (unit(g, 'ai', 'z1')!.hp === 7 && unit(g, 'ai', 'k1')!.hp === 9) ok++
  }
  check(`žala žudikui (${ok}/${REP})`, ok === REP)
}

console.log('\n── 9. Reakcija „kai priešas gydo padarą" → žala PAGYDYTAM ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = freshGame()
    P(g, 'you').reactions[0] = { uid: 'r3', card: reactCard('Nuodinga zaizda', 'r3', { trigger: 'onAnyHeal', triggerSide: 'enemy' }), paid: 0 } as never
    const w = mkUnit(mkCard({ name: 'Gydomas', uid: 'g1', attack: 0 })); w.hp = 4
    P(g, 'ai').units[0] = w as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Kitas', uid: 'k1', attack: 0 })) as never
    g.you.hand.length = 0
    P(g, 'ai').units[2] = mkUnit(mkCard({ name: 'Gydytojas', uid: 'h1', attack: 1, mappings: [{ trigger: 'onAttack', effect: 'heal', target: 'ownUnit', value: 3, requiresSelection: false } as EffectMapping] })) as never
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Manas', uid: 'm1', attack: 0 })) as never
    g.active = 'ai'
    attack(g, 'ai', 'h1', { kind: 'unit', side: 'you', uid: 'm1' })
    // gydomas 4→7, reakcija −2 → 5; kitas nepaliestas
    if (unit(g, 'ai', 'g1')!.hp === 5 && unit(g, 'ai', 'k1')!.hp === 9) ok++
  }
  check(`žala pagydytam (${ok}/${REP})`, ok === REP)
}


console.log('\n── 10. Reakcija „kai priešas iškviečia padarą" (Liepsnos liežuviai) → žala IŠKVIESTAM (sužaistam iš rankos) ──')
{
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = createGame(filler(30, 'X'), filler(30, 'A'), 'ai', { zmkDefs: ZMK0 }); beginTurn(g); g.reactionGates = null; g.ai.gold = 1000
    P(g, 'you').reactions[0] = { uid: 'll', card: mkCard({ name: 'Liepsnos liezuviai', uid: 'll', type: 'reaction', mappings: [{ effect: 'damage', value: 6, target: 'enemyUnit', trigger: 'onAnySummon', triggerSide: 'enemy', overflowToPlayer: true, requiresSelection: true, triggersZmk: false } as EffectMapping] }), paid: 0 } as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Senas1', uid: 's1' })) as never
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Senas2', uid: 's2' })) as never
    g.ai.hand.push(mkCard({ name: 'Naujokas', uid: 'n1', health: 9 }))
    playCard(g, 'ai', 'n1')
    if (unit(g, 'ai', 'n1')!.hp === 3 && unit(g, 'ai', 's1')!.hp === 9 && unit(g, 'ai', 's2')!.hp === 9) ok++
  }
  check(`žala iškviestam iš rankos (${ok}/${REP})`, ok === REP)
}

console.log('\n──────────────')
console.log('\n── 11. KLASIKA (format: classic) — be ŽMK: žala = bazinė, kaladės tuščios, jokių zmk įrašų ──')
{
  const ZMK2 = [{ id: 'z2', name: '×2', description: null, value: 'x2' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
  let ok = 0
  for (let r = 0; r < REP; r++) {
    const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK2, format: 'classic' }); beginTurn(g); g.reactionGates = null
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'p1', attack: 3 })) as never
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'A', uid: 'a1', attack: 0 })) as never
    const before = g.log.length
    attack(g, 'you', 'p1', { kind: 'unit', side: 'ai', uid: 'a1' })
    const a = unit(g, 'ai', 'a1')
    const zmkEvents = g.log.slice(before).filter((e) => e.t === 'zmk' || e.t === 'zmkReshuffle').length
    if (a && a.hp === 6 && zmkEvents === 0 && P(g, 'you').zmk.length === 0 && g.format === 'classic') ok++
  }
  check(`ataka 3 → 3 žalos (ne ×2), be zmk įvykių (${ok}/${REP})`, ok === REP)
  const g0 = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK2 })
  check('numatytas formatas — zmk, ŽMK kaladė pilna', g0.format === 'zmk' && P(g0, 'you').zmk.length > 0)
}

console.log(`  PASS: ${pass}   FAIL: ${fail}`)
console.log('──────────────')
if (fail > 0) process.exit(1)
