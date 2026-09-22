// ── Scenų FX vartų testai (ŽMK skrydis + Kovos šūksnis / Paskutinis noras / Trigeris) ──
// Paleidimas: npm run game:test:scenes
// Tikrina, kad variklis su `setSceneGatesEnabled(true)` deda teisingus kadrus į
// `g.reactionGates` (snapshot PRIEŠ efektą, gretimi ŽMK traukimai jungiami į vieną
// vėduoklę, chronologija šūksnis → ŽMK), o išjungus — elgsena identiška 704.

import {
  createGame, beginTurn, playCard, attack, endTurn, P,
  consumeReactionSnapshot, setSceneGatesEnabled, isSceneGatesEnabled,
  type TutCard, type GameState, type ReactionGate,
} from '../src/lib/tutorial/engine'
import type { EffectMapping } from '../src/lib/game/types'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name, extra) }
}

const ZMK1 = [{ id: 'z', name: '+1', description: null, value: '+1' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]

function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return {
    id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3,
    type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff',
    effect: null, mappings: [], ...over,
  } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))
function freshGame(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK1 })
  beginTurn(g)
  g.you.gold = 1000; g.ai.gold = 1000
  g.reactionGates = null
  return g
}
const mkUnit = (c: TutCard, hp = 6) => ({ uid: c.uid, card: c, atk: c.attack ?? 2, hp, maxHp: hp, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false })
const gates = (g: GameState): ReactionGate[] => g.reactionGates ?? []
const kinds = (g: GameState) => gates(g).map((x) => x.kind ?? 'reaction').join(',')
const dmgMapping = (trigger: string, target: string, value: number): EffectMapping => ({ trigger, effect: 'damage', target, value, requiresSelection: false } as EffectMapping)

console.log('\n── 0. Vėliava išjungta → vartų nėra (704 elgsena) ──')
{
  setSceneGatesEnabled(false)
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Taikinys', uid: 'tgt' })) as never
  const bc = mkCard({ name: 'Saukejas', uid: 'bc1', mappings: [dmgMapping('onSummon', 'enemyUnit', 2)] })
  g.you.hand.push(bc)
  playCard(g, 'you', 'bc1')
  check('vartų nėra', gates(g).length === 0, kinds(g))
  check('žala pritaikyta (6 → 3 su +1)', P(g, 'ai').units[0]!.hp === 3, String(P(g, 'ai').units[0]!.hp))
  check('žalos įvykis be viaScene', g.log.every((e) => e.viaScene === undefined))
}

console.log('\n── 1. Kovos šūksnis su žala: vartai [battlecry, zmk], snapshot PRIEŠ žalą ──')
{
  setSceneGatesEnabled(true)
  check('vėliava įjungta', isSceneGatesEnabled())
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Taikinys', uid: 'tgt' })) as never
  const bc = mkCard({ name: 'Saukejas', uid: 'bc1', mappings: [dmgMapping('onSummon', 'enemyUnit', 2)] })
  g.you.hand.push(bc)
  playCard(g, 'you', 'bc1')
  check('vartai: battlecry → zmk', kinds(g) === 'battlecry,zmk', kinds(g))
  const [gb, gz] = gates(g)
  check('battlecry kadras nurodo šaltinį', gb.sourceUid === 'bc1' && gb.sourceName === 'Saukejas', JSON.stringify(gb))
  check('zmk kadras: 1 traukimas, +1, žala 3, taikinys tgt', gz.draws?.length === 1 && gz.draws[0].value === '+1' && gz.draws[0].dmg === 3 && gz.draws[0].target.kind === 'unit' && gz.draws[0].target.uid === 'tgt', JSON.stringify(gz.draws))
  const snapB = consumeReactionSnapshot(gb.snapshotId)
  const snapZ = consumeReactionSnapshot(gz.snapshotId)
  check('battlecry snapshot: taikinys dar 6 HP, šaukėjas jau lentoje', !!snapB && P(snapB, 'ai').units[0]!.hp === 6 && P(snapB, 'you').units.some((u) => u?.uid === 'bc1'))
  check('zmk snapshot: taikinys dar 6 HP (žala tik po skrydžio)', !!snapZ && P(snapZ, 'ai').units[0]!.hp === 6)
  check('snapshot\'uose vartų nėra (nesidubliuoja)', !snapB?.reactionGates && !snapZ?.reactionGates)
  check('galutinė būsena: 3 HP', P(g, 'ai').units[0]!.hp === 3)
  check('battlecry įvykis PRIEŠ zmk įvykį žurnale', g.log.findIndex((e) => e.t === 'battlecry') < g.log.findIndex((e) => e.t === 'zmk'))
  check('zmk ir damage įvykiai pažymėti viaScene', g.log.filter((e) => e.t === 'zmk' || (e.t === 'damage' && (e.value ?? 0) > 0)).every((e) => e.viaScene === true))
  check('gate.atLog ≤ zmk įvykio indeksas', gz.atLog <= g.log.findIndex((e) => e.t === 'zmk') + 1, `${gz.atLog}`)
}

console.log('\n── 2. Ataka: abu ŽMK (puolėjo + atgalinė) VIENOJE vėduoklėje ──')
{
  setSceneGatesEnabled(true)
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'atk1', attack: 3 }), 8) as never
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Gynejas', uid: 'def1', attack: 2 }), 8) as never
  attack(g, 'you', 'atk1', { kind: 'unit', side: 'ai', uid: 'def1' })
  check('vienas zmk kadras', kinds(g) === 'zmk', kinds(g))
  const gz = gates(g)[0]
  check('2 traukimai: you→def1, ai→atk1', gz.draws?.length === 2 && gz.draws[0].side === 'you' && gz.draws[0].target.kind === 'unit' && gz.draws[0].target.uid === 'def1' && gz.draws[1].side === 'ai' && gz.draws[1].target.kind === 'unit' && gz.draws[1].target.uid === 'atk1', JSON.stringify(gz.draws))
  const snap = consumeReactionSnapshot(gz.snapshotId)
  check('snapshot: abu dar 8 HP', !!snap && P(snap, 'you').units[0]!.hp === 8 && P(snap, 'ai').units[0]!.hp === 8)
  check('galutinė: gynėjas 8-4=4, puolėjas 8-3=5', P(g, 'ai').units[0]!.hp === 4 && P(g, 'you').units[0]!.hp === 5, `${P(g, 'ai').units[0]!.hp}/${P(g, 'you').units[0]!.hp}`)
}

console.log('\n── 3. AoE (3 taikiniai) → vienas zmk kadras su 3 traukimais ──')
{
  setSceneGatesEnabled(true)
  const g = freshGame()
  for (let i = 0; i < 3; i++) P(g, 'ai').units[i] = mkUnit(mkCard({ name: 'T' + i, uid: 't' + i })) as never
  const bc = mkCard({ name: 'AoE', uid: 'aoe1', mappings: [{ trigger: 'onSummon', effect: 'damage', target: 'allEnemyUnits', value: 1, requiresSelection: false } as EffectMapping] })
  g.you.hand.push(bc)
  playCard(g, 'you', 'aoe1')
  check('vartai: battlecry → zmk', kinds(g) === 'battlecry,zmk', kinds(g))
  const gz = gates(g)[1]
  check('3 traukimai vienoje vėduoklėje', gz?.draws?.length === 3, JSON.stringify(gz?.draws?.length))
  check('snapshot\'ų sunaudojimas (2)', !!consumeReactionSnapshot(gates(g)[0].snapshotId) && !!consumeReactionSnapshot(gz.snapshotId))
}

console.log('\n── 4. Paskutinis noras: lastwish kadras PO mirties, šaltinis dar snapshot\'e ──')
{
  setSceneGatesEnabled(true)
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Gynejas', uid: 'def1', attack: 0 }), 9) as never
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Mirstantis', uid: 'lw1', attack: 1, mappings: [dmgMapping('onDeath', 'enemyUnit', 2)] }), 1) as never
  P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Zudikas', uid: 'kill1', attack: 5 }), 9) as never
  g.active = 'ai'
  attack(g, 'ai', 'kill1', { kind: 'unit', side: 'you', uid: 'lw1' })
  check('vartai: zmk (ataka) → lastwish → zmk (noro žala)', kinds(g) === 'zmk,lastwish,zmk', kinds(g))
  const glw = gates(g)[1]
  check('lastwish šaltinis lw1', glw.sourceUid === 'lw1' && glw.side === 'you')
  const snap = consumeReactionSnapshot(glw.snapshotId)
  check('lastwish snapshot: mirštantis dar lentoje, gynėjas dar 9 HP', !!snap && P(snap, 'you').units.some((u) => u?.uid === 'lw1') && P(snap, 'ai').units[0]!.hp === 9)
  // kill1: atgalinė 1+1=2 (9→7), tada Paskutinis noras į trigerio šaltinį 2+1=3 (7→4); def1 nepaliestas
  check('galutinė: žudikas 9→4 (atgalinė + noras), gynėjas 9', P(g, 'ai').units[1]!.hp === 4 && P(g, 'ai').units[0]!.hp === 9, `${P(g, 'ai').units[0]!.hp},${P(g, 'ai').units[1]!.hp}`)
  check('mirštantis nebe lentoje', !P(g, 'you').units.some((u) => u?.uid === 'lw1'))
}

console.log('\n── 5. Trigeris ėjimo pradžioje (onTurnStart) → trigger kadras + zmk ──')
{
  setSceneGatesEnabled(true)
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Auka', uid: 'v1' }), 7) as never
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Belzataras', uid: 'bz1', mappings: [dmgMapping('onTurnStart', 'enemyUnit', 2)] }), 9) as never
  g.reactionGates = null
  endTurn(g); beginTurn(g)   // → AI ėjimas prasideda, onTurnStart
  const ks = kinds(g)
  check('yra trigger kadras ir po jo zmk', /trigger,zmk/.test(ks), ks)
  const gt = gates(g).find((x) => x.kind === 'trigger')!
  check('trigerio šaltinis bz1 (ai)', gt.sourceUid === 'bz1' && gt.side === 'ai')
  const snap = consumeReactionSnapshot(gt.snapshotId)
  check('snapshot: auka dar 7 HP', !!snap && P(snap, 'you').units[0]!.hp === 7)
  check('galutinė: auka 7-3=4', P(g, 'you').units[0]!.hp === 4, String(P(g, 'you').units[0]!.hp))
  for (const x of gates(g)) consumeReactionSnapshot(x.snapshotId)
}

console.log('\n── 6. Reakcijos viduje ŽMK NEgauna atskiro kadro (viaReaction) ──')
{
  setSceneGatesEnabled(true)
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'p1', attack: 1 }), 9) as never
  const reactCard = mkCard({
    name: 'Reakcija', uid: 'react1', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyUnit', value: 3, useTriggerSource: true } as EffectMapping],
  })
  P(g, 'you').reactions[0] = { uid: 'react1', card: reactCard, paid: 0 } as never
  g.active = 'ai'
  attack(g, 'ai', 'p1', { kind: 'player', side: 'you' })
  const ks = kinds(g)
  check('reakcijos kadras yra, ŽMK viduje jos — be atskiro kadro; atakos ŽMK — atskirai', ks.split(',').filter((k) => k === 'reaction').length === 1 && ks.split(',').filter((k) => k === 'zmk').length === 1, ks)
  check('reakcijos žala pažymėta viaReaction, ne viaScene', g.log.some((e) => e.viaReaction && e.t === 'damage') && !g.log.some((e) => e.viaReaction && e.viaScene))
  for (const x of gates(g)) consumeReactionSnapshot(x.snapshotId)
}

console.log('\n── 7. Skydas: ŽMK netraukiamas → kadro nėra ──')
{
  setSceneGatesEnabled(true)
  const g = freshGame()
  const shielded = mkUnit(mkCard({ name: 'Skydas', uid: 'sh1', attack: 0 }), 5); shielded.shield = true
  P(g, 'ai').units[0] = shielded as never
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'atk1', attack: 3 }), 8) as never
  attack(g, 'you', 'atk1', { kind: 'unit', side: 'ai', uid: 'sh1' })
  check('vartų nėra (skydas anuliavo, gynėjas be atakos)', gates(g).length === 0, kinds(g))
  check('skydas nuimtas, HP nepakito', !P(g, 'ai').units[0]!.shield && P(g, 'ai').units[0]!.hp === 5)
}

setSceneGatesEnabled(false)
console.log('\n──────────────')
console.log(`  PASS: ${pass}   FAIL: ${fail}`)
console.log('──────────────')
if (fail > 0) process.exit(1)
