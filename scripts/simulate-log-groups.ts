// ── Kovos žurnalo v2 grupavimo testai ────────────────────────────────────────
// Paleidimas: npm run game:test:log
// Realūs variklio žurnalai → groupLog → tikrinam korteles (1 veiksmas = 1 kortelė).

import {
  createGame, beginTurn, endTurn, playCard, attack, P,
  setSceneGatesEnabled, type TutCard, type GameState,
} from '../src/lib/tutorial/engine'
import type { EffectMapping } from '../src/lib/game/types'
import { groupLog, lastActions } from '../src/lib/game/logGroups'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
const ZMK1 = [{ id: 'z', name: '+1', description: null, value: '+1' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))
function freshGame(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK1 })
  beginTurn(g); g.you.gold = 1000; g.ai.gold = 1000; g.reactionGates = null
  return g
}
const mkUnit = (c: TutCard, hp = 6) => ({ uid: c.uid, card: c, atk: c.attack ?? 2, hp, maxHp: hp, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false })
const dmgMapping = (trigger: string, target: string, value: number): EffectMapping => ({ trigger, effect: 'damage', target, value, requiresSelection: false } as EffectMapping)
const kinds = (g: GameState) => groupLog(g.log).map((a) => a.kind + (a.keyword ? ':' + a.keyword : '')).join(',')

setSceneGatesEnabled(false)

console.log('\n── 1. Ėjimo antraštė sugeria traukimus, auksą ir „baigia ėjimą" ──')
{
  const g = freshGame()
  const acts = groupLog(g.log)
  const turn = acts.find((a) => a.kind === 'turn')!
  check('yra ėjimo antraštė', !!turn && turn.turn!.n === 1, kinds(g))
  check('traukimai suskaičiuoti (≥4 pradinė ranka arba 1)', turn.turn!.draws >= 1, String(turn.turn!.draws))
  check('ėjimo auksas > 0', turn.turn!.gold > 0, String(turn.turn!.gold))
  check('nėra atskirų draw/gold kortelių', !acts.some((a) => a.root.t === 'draw' || a.root.t === 'gold'))
  const n0 = g.log.length
  endTurn(g); beginTurn(g)
  const acts2 = groupLog(g.log.slice(n0))
  check('endTurn nesukuria kortelės; kitas ėjimas – nauja antraštė', acts2.length === 1 && acts2[0].kind === 'turn', acts2.map((a) => a.kind).join(','))
}

console.log('\n── 2. Ataka su atgaline žala ir dviguba žūtimi → VIENA kortelė ──')
{
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'atk1', attack: 5 }), 3) as never
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Gynejas', uid: 'def1', attack: 4 }), 4) as never
  const n0 = g.log.length
  attack(g, 'you', 'atk1', { kind: 'unit', side: 'ai', uid: 'def1' })
  const acts = groupLog(g.log.slice(n0))
  check('viena kortelė', acts.length === 1 && acts[0].kind === 'attack', acts.map((a) => a.kind).join(','))
  const a = acts[0]
  check('šaltinis – puolikas', a.source?.name === 'Puolikas')
  check('2 taikiniai (gynėjas + puolėjas atgal)', a.targets.length === 2, JSON.stringify(a.targets.map((t) => t.name)))
  const def = a.targets.find((t) => t.name === 'Gynejas')!, atk = a.targets.find((t) => t.name === 'Puolikas')!
  check('gynėjo hit: −6 su ŽMK +1, tada žūtis', def.hits[0]?.t === 'dmg' && def.hits[0].value === 6 && def.hits[0].zmk === '+1' && def.hits.some((h) => h.t === 'death'), JSON.stringify(def.hits))
  check('puolėjo hit: −5 su ŽMK +1, žūtis', atk.hits[0]?.t === 'dmg' && atk.hits[0].value === 5 && atk.hits[0].zmk === '+1' && atk.hits.some((h) => h.t === 'death'), JSON.stringify(atk.hits))
  check('abipusė (⇄)', a.mutual === true)
  check('important', a.important)
  check('detalėse visi įvykiai (attack, 2 zmk, 2 damage, 2 death)', a.events.filter((e) => e.t === 'zmk').length === 2 && a.events.filter((e) => e.t === 'death').length === 2)
}

console.log('\n── 3. Iškvietimas su šūksniu AoE → viena kortelė su raktažodžiu ir 3 taikiniais ──')
{
  const g = freshGame()
  for (let i = 0; i < 3; i++) P(g, 'ai').units[i] = mkUnit(mkCard({ name: 'T' + i, uid: 't' + i })) as never
  g.you.hand.push(mkCard({ name: 'AoE', uid: 'aoe1', gold: 300, mappings: [{ trigger: 'onSummon', effect: 'damage', target: 'allEnemyUnits', value: 1, requiresSelection: false } as EffectMapping] }))
  const n0 = g.log.length
  playCard(g, 'you', 'aoe1')
  const acts = groupLog(g.log.slice(n0))
  check('viena kortelė play su keyword battlecry', acts.length === 1 && acts[0].kind === 'play' && acts[0].keyword === 'battlecry', kinds({ log: g.log.slice(n0) } as GameState))
  check('3 taikiniai su ŽMK žymėmis', acts[0].targets.length === 3 && acts[0].targets.every((t) => t.hits[0]?.t === 'dmg' && t.hits[0].zmk === '+1'), JSON.stringify(acts[0].targets))
  check('kaina 300', acts[0].cost === 300)
}

console.log('\n── 4. Iškvietimas be efekto → kortelė NE svarbi (filtras „Svarbu" slepia) ──')
{
  const g = freshGame()
  g.you.hand.push(mkCard({ name: 'Paprastas', uid: 'pl1', gold: 100 }))
  const n0 = g.log.length
  playCard(g, 'you', 'pl1')
  const acts = groupLog(g.log.slice(n0))
  check('play kortelė, important=false', acts.length === 1 && acts[0].kind === 'play' && !acts[0].important)
  check('lastActions(important) ją praleidžia', lastActions(acts, 3, 'important').length === 0)
  check('lastActions(all) ją rodo', lastActions(acts, 3, 'all').length === 1)
}

console.log('\n── 5. Paskutinis noras → atskira kortelė PO atakos, su savo taikiniu ──')
{
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Gynejas', uid: 'def1', attack: 0 }), 9) as never
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Mirstantis', uid: 'lw1', attack: 1, mappings: [dmgMapping('onDeath', 'enemyUnit', 2)] }), 1) as never
  P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Zudikas', uid: 'kill1', attack: 5 }), 9) as never
  g.active = 'ai'
  const n0 = g.log.length
  attack(g, 'ai', 'kill1', { kind: 'unit', side: 'you', uid: 'lw1' })
  const acts = groupLog(g.log.slice(n0))
  const ks = acts.map((a) => a.kind).join(',')
  check('kortelės: attack → lastwish', ks === 'attack,lastwish', ks)
  const lw = acts[1]
  check('noro šaltinis – mirštantis, keyword lastwish', lw.source?.name === 'Mirstantis' && lw.keyword === 'lastwish')
  check('noro taikinys gavo −3 su ŽMK +1', lw.targets.some((t) => t.hits[0]?.t === 'dmg' && t.hits[0].value === 3 && t.hits[0].zmk === '+1'), JSON.stringify(lw.targets))
  check('atakos kortelėje mirštančio žūtis', acts[0].targets.find((t) => t.name === 'Mirstantis')?.hits.some((h) => h.t === 'death') === true)
}

console.log('\n── 6. Trigeris ėjimo pradžioje → trigger kortelė po ėjimo antraštės ──')
{
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Auka', uid: 'v1' }), 7) as never
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Belz', uid: 'bz1', mappings: [dmgMapping('onTurnStart', 'enemyUnit', 2)] }), 9) as never
  const n0 = g.log.length
  endTurn(g); beginTurn(g)
  const acts = groupLog(g.log.slice(n0))
  const ks = acts.map((a) => a.kind + (a.keyword ? ':' + a.keyword : '')).join(',')
  check('turn → trigger:trigger', ks.startsWith('turn,trigger:trigger'), ks)
  const tr = acts[1]
  check('trigerio šaltinis Belz (ai), taikinys Auka −3', tr.source?.name === 'Belz' && tr.side === 'ai' && tr.targets[0]?.name === 'Auka' && tr.targets[0].hits[0]?.value === 3, JSON.stringify(tr.targets))
}

console.log('\n── 7. Reakcija atakos metu → reakcijos kortelė, atakos kortelė lieka viena ──')
{
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'p1', attack: 1 }), 9) as never
  const reactCard = mkCard({ name: 'Reakcija', uid: 'react1', type: 'reaction', mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyUnit', value: 3, useTriggerSource: true } as EffectMapping] })
  P(g, 'you').reactions[0] = { uid: 'react1', card: reactCard, paid: 0 } as never
  g.active = 'ai'
  const n0 = g.log.length
  attack(g, 'ai', 'p1', { kind: 'player', side: 'you' })
  const acts = groupLog(g.log.slice(n0))
  const ks = acts.map((a) => a.kind).join(',')
  check('kortelės: attack, reaction (chronologija išlaikyta)', ks.split(',').filter((k) => k === 'attack').length === 1 && ks.includes('reaction'), ks)
  const re = acts.find((a) => a.kind === 'reaction')!
  check('reakcijos šaltinis – reakcijos korta, taikinys – puolikas −4', re.source?.name === 'Reakcija' && re.targets.some((t) => t.name === 'Puolikas' && t.hits.some((h) => h.t === 'dmg' && h.value === 4)), JSON.stringify(re.targets))
}

console.log('\n── 8. Skydas: blokas kaip hit, be ŽMK ──')
{
  const g = freshGame()
  const sh = mkUnit(mkCard({ name: 'Skydas', uid: 'sh1', attack: 0 }), 5); sh.shield = true
  P(g, 'ai').units[0] = sh as never
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'atk1', attack: 3 }), 8) as never
  const n0 = g.log.length
  attack(g, 'you', 'atk1', { kind: 'unit', side: 'ai', uid: 'sh1' })
  const acts = groupLog(g.log.slice(n0))
  check('attack kortelė su block hit\'u', acts.length === 1 && acts[0].targets.some((t) => t.name === 'Skydas' && t.hits[0]?.t === 'block'), JSON.stringify(acts[0]?.targets))
  check('ne abipusė (gynėjas 0 ATK)', acts[0].mutual === false)
}

console.log('\n──────────────')
console.log(`  PASS: ${pass}   FAIL: ${fail}`)
console.log('──────────────')
if (fail > 0) process.exit(1)
