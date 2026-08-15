// ── AI difficulty rebalanso + goodPlayer euristikų regresijos ────────────────
// Paleidimas: npm run game:test:aidiff
// Dengia: normal = senas hard; hard goodPlayer: buff PRIEŠ ataką, freeze/stun
// setup (nešaldo jau neutralizuoto), atakuoja AKTYVŲ vietoj stunned, AoE
// worth-it, spell-engine (Džilė) hold, priešo-draw sinergijos (Demonai).

import { createGame, beginTurn, P, type TutCard, type GameState, type BoardUnit } from '../src/lib/tutorial/engine'
import { DIFFICULTY_WEIGHTS, mergeWeights } from '../src/lib/tutorial/ai/aiTypes'
import { scorePlayCard, evaluateAoEValue } from '../src/lib/tutorial/ai/aiScoring'
import { scoreAttack, pickThreatTarget } from '../src/lib/tutorial/ai/aiTargeting'
import type { EffectMapping } from '../src/lib/game/types'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name, extra) }
}

const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
const W_HARD = mergeWeights(DIFFICULTY_WEIGHTS.hard, { jitter: -1 })
const W_NORM = mergeWeights(DIFFICULTY_WEIGHTS.normal, { jitter: -1 })

function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return {
    id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3,
    type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff',
    effect: null, mappings: [], ...over,
  } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))
const mkUnit = (c: TutCard, hp: number, over: Partial<BoardUnit> = {}): BoardUnit => ({
  uid: c.uid, card: c, atk: c.attack ?? 2, hp, maxHp: hp, shield: false, stealth: false,
  statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false, ...over,
} as BoardUnit)

function freshGame(): GameState {
  const g = createGame(filler(15, 'Y'), filler(15, 'A'), 'ai', { zmkDefs: ZMK0 as never })
  beginTurn(g)
  return g
}

console.log('◆ Svoriai: normal = senas hard')
{
  const n = DIFFICULTY_WEIGHTS.normal
  check('normal faceBias -2 / tradeThreshold 0 / removalMinValue 5 / lookahead', n.faceBias === -2 && n.tradeThreshold === 0 && n.removalMinValue === 5 && n.lookahead === true)
  check('normal BE goodPlayer, hard SU goodPlayer', !n.goodPlayer && DIFFICULTY_WEIGHTS.hard.goodPlayer === true)
  check('easy nepakitęs (faceBias 6, be lookahead)', DIFFICULTY_WEIGHTS.easy.faceBias === 6 && !DIFFICULTY_WEIGHTS.easy.lookahead && !DIFFICULTY_WEIGHTS.easy.goodPlayer)
}

console.log('◆ Buff PRIEŠ ataką (hard)')
{
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Puolikas', uid: 'p1', attack: 3 }), 4)
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Siena', uid: 's1', attack: 2 }), 6)
  const buff = mkCard({ name: 'Jega', uid: 'b1', type: 'spell', mappings: [{ trigger: 'onCast', effect: 'buffAttack', target: 'ownUnit', value: 3, triggersZmk: false } as EffectMapping] })
  const hardSc = scorePlayCard(g, buff, W_HARD, false).score
  const normSc = scorePlayCard(g, buff, W_NORM, false).score
  check('hard buff score pakeltas virš normal (seka: buff → ataka)', hardSc > normSc, `hard=${hardSc.toFixed(1)} norm=${normSc.toFixed(1)}`)
  const atkSc = scoreAttack(g, P(g, 'ai').units[0]!, { kind: 'unit', side: 'you', uid: 's1' }, W_HARD)
  check('hard: buff rikiuojasi PRIEŠ šio padaro ataką', hardSc > atkSc, `buff=${hardSc.toFixed(1)} atk=${atkSc.toFixed(1)}`)
}

console.log('◆ Freeze/stun setup (hard)')
{
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Karys', uid: 'k1', attack: 4 }), 5)
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Grasus', uid: 'g1', attack: 6 }), 7)
  const frz = mkCard({ name: 'Ledas', uid: 'f1', type: 'spell', mappings: [{ trigger: 'onCast', effect: 'freeze', target: 'enemyUnit', triggersZmk: false } as EffectMapping] })
  const hardSc = scorePlayCard(g, frz, W_HARD, false).score
  const normSc = scorePlayCard(g, frz, W_NORM, false).score
  check('freeze premija pagal taikinio ATK (hard > normal)', hardSc > normSc, `hard=${hardSc.toFixed(1)} norm=${normSc.toFixed(1)}`)
  // jau neutralizuoto nebesaldom - renkamas AKTYVUS
  P(g, 'you').units[0]!.statuses.frozen = 9999
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Aktyvus', uid: 'g2', attack: 5 }), 6)
  const t = pickThreatTarget(g, W_HARD, false, { skipNeutralized: true })
  check('nešaldom jau užšaldyto – taikinys AKTYVUS padaras', t.target?.kind === 'unit' && (t.target as { uid: string }).uid === 'g2', JSON.stringify(t.target))
}

console.log('◆ Atakos prioritetai (hard)')
{
  const g = freshGame()
  const atkU = mkUnit(mkCard({ name: 'Kirtiklis', uid: 'a1', attack: 4 }), 5)
  P(g, 'ai').units[0] = atkU
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Stunned', uid: 'st1', attack: 4 }), 4, { statuses: { stunned: 9999 } as never })
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Aktyvus', uid: 'ak1', attack: 4 }), 4)
  const sStun = scoreAttack(g, atkU, { kind: 'unit', side: 'you', uid: 'st1' }, W_HARD)
  const sAct = scoreAttack(g, atkU, { kind: 'unit', side: 'you', uid: 'ak1' }, W_HARD)
  check('hard kerta AKTYVŲ, ne stunned (stunned vis tiek praleis ėjimą)', sAct > sStun, `act=${sAct.toFixed(1)} stun=${sStun.toFixed(1)}`)
  const sStunN = scoreAttack(g, atkU, { kind: 'unit', side: 'you', uid: 'st1' }, W_NORM)
  const sActN = scoreAttack(g, atkU, { kind: 'unit', side: 'you', uid: 'ak1' }, W_NORM)
  check('normal elgesys nepakitęs (lygūs taikiniai ~lygūs)', Math.abs(sStunN - sActN) < 0.01, `act=${sActN} stun=${sStunN}`)
}

console.log('◆ AoE worth-it (hard griežtesnis)')
{
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Vienintelis', uid: 'v1', attack: 2 }), 2)
  const hard = evaluateAoEValue(g, 3, W_HARD)
  check('hard AoE ant 1 pigaus padaro – praleidžiama', !isFinite(hard.score) || hard.score <= 0, `score=${hard.score}`)
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Antras', uid: 'v2', attack: 2 }), 2)
  const hard2 = evaluateAoEValue(g, 3, W_HARD)
  check('hard AoE su 2 nužudymais – verta', isFinite(hard2.score) && hard2.score > 0, `score=${hard2.score}`)
}

console.log('◆ Spell-engine hold (Džilė) (hard)')
{
  const g = freshGame()
  const dzile = mkCard({ name: 'Gydune Dzile', uid: 'dz1', gold: 300, gameplay: { passiveAura: { spellLifestealScope: 'friendly' } } as never })
  P(g, 'ai').gold = 1000
  const noBurst = scorePlayCard(g, dzile, W_HARD, false)
  check('be žalos burtų rankoje – LAIKOMA (score nubaustas)', noBurst.score < scorePlayCard(g, dzile, W_NORM, false).score, `hard=${noBurst.score.toFixed(1)}`)
  // su 2 zalos burtais rankoje - langas atsidaro
  P(g, 'ai').hand.push(
    mkCard({ name: 'Ugnis1', uid: 'u1', type: 'spell', mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 3, triggersZmk: false } as EffectMapping] }),
    mkCard({ name: 'Ugnis2', uid: 'u2', type: 'spell', mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 3, triggersZmk: false } as EffectMapping] }),
  )
  const burst = scorePlayCard(g, dzile, W_HARD, false)
  check('su 2 žalos burtais – žaidžiama su premija', burst.score > noBurst.score + 5, `burst=${burst.score.toFixed(1)} vs ${noBurst.score.toFixed(1)}`)
}

console.log('◆ Priešo-draw sinergija (Demonai) (hard)')
{
  const g = freshGame()
  const drawCard = mkCard({ name: 'Klastingas Dosnumas', uid: 'dd1', type: 'spell', mappings: [{ trigger: 'onCast', effect: 'drawCards', target: 'enemyPlayer', value: 2, drawAppliesTo: 'opponent', triggersZmk: false } as EffectMapping] })
  const hold = scorePlayCard(g, drawCard, W_HARD, false)
  check('be sinergijos – LAIKOMA (skip)', !isFinite(hold.score), `score=${hold.score}`)
  const norm = scorePlayCard(g, drawCard, W_NORM, false)
  check('normal žaidžia kaip anksčiau (be hold)', isFinite(norm.score) && norm.score > 0, `score=${norm.score}`)
  // 1) prakeiksmai jau imaisyti i prieso kalade
  P(g, 'you').deck.push(mkCard({ name: 'Prakeiksmas X', uid: 'cx1', type: 'curse' }))
  const withCurse = scorePlayCard(g, drawCard, W_HARD, false)
  check('su prakeiksmais priešo kaladėje – žaidžiama', isFinite(withCurse.score) && withCurse.score >= 5, `score=${withCurse.score}`)
  // 2) Ongromig sinergija (onAnyDraw enemy -> damage)
  P(g, 'you').deck.pop()
  const ongromig = mkCard({ name: 'Ongromigas', uid: 'og1', mappings: [{ trigger: 'onAnyDraw', triggerSide: 'enemy', effect: 'damage', target: 'enemyPlayer', value: 2, triggersZmk: false } as EffectMapping] })
  P(g, 'ai').units[0] = mkUnit(ongromig, 5)
  const withOngromig = scorePlayCard(g, drawCard, W_HARD, false)
  check('su Ongromig lentoje – žaidžiama', isFinite(withOngromig.score) && withOngromig.score >= 5, `score=${withOngromig.score}`)
}

console.log('◆ Continuous efektų prioritizacija (hard)')
{
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Statai', uid: 'pl1', attack: 4 }), 6)
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'AuraNesejas', uid: 'au1', attack: 2, gameplay: { passiveAura: { auraAttack: 2 } } as never, mappings: [{ trigger: 'onTurnStart', effect: 'heal', target: 'allOwnUnits', value: 1, triggersZmk: false } as EffectMapping] }), 5)
  const t = pickThreatTarget(g, W_HARD, false)
  check('kontrolė/removal PIRMIAUSIA ant continuous efekto nešėjo', t.target?.kind === 'unit' && (t.target as { uid: string }).uid === 'au1', JSON.stringify(t.target))
}

// ── Hard planner (commit603): lethal solver, reverse lethal, bait, biudžetai ──
import { computeGuaranteedLethal, pessimisticZmkTotal, reverseLethalRisk } from '../src/lib/tutorial/ai/aiHardPlanner'
import { decideAiTurn } from '../src/lib/tutorial/ai/aiEngine'
import { faceScore } from '../src/lib/tutorial/ai/aiTargeting'

const ZMK_X0 = [
  { id: 'z0', name: '+0', description: null, value: '+0' as const, count: 18, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 },
  { id: 'zx', name: 'x0', description: null, value: 'x0' as const, count: 1, mode: 'auto' as const, image_url: null, active: true, sort_order: 2 },
  { id: 'zm', name: '-2', description: null, value: '-2' as const, count: 1, mode: 'auto' as const, image_url: null, active: true, sort_order: 3 },
]

console.log('◆ Lethal solver (pesimistinis)')
{
  const g = freshGame()
  g.you.hp = 7
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Kirvis', uid: 'lk1', attack: 4 }), 5)
  P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Durklas', uid: 'lk2', attack: 3 }), 4)
  const plan = computeGuaranteedLethal(g)
  check('7 HP vs 4+3 su +0 kalade – lethal garantuotas', plan.lethal, JSON.stringify(plan))
  const ranked = decideAiTurn(g, { difficulty: 'hard', weights: { jitter: -1 } })
  check('veido atakos gauna lethal boost (>8000)', ranked[0].score > 7000 && ranked[0].descriptor.type === 'attack', `top=${ranked[0]?.reason} ${ranked[0]?.score.toFixed(0)}`)
}
{
  // Pesimizmas: su x0 ir -2 kaladeje 7 HP vs 4+3 NEBEgarantuota (4->0, 3->1)
  const g = createGame(filler(15, 'Y'), filler(15, 'A'), 'ai', { zmkDefs: ZMK_X0 as never })
  beginTurn(g)
  g.you.hp = 7
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Kirvis', uid: 'lk3', attack: 4 }), 5)
  P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Durklas', uid: 'lk4', attack: 3 }), 4)
  const plan = computeGuaranteedLethal(g)
  check('su x0/-2 kaladėje 7 HP NEgarantuota (pesimizmas)', !plan.lethal, `guaranteed=${plan.guaranteed}`)
  check('pessimisticZmkTotal([4,3]) = 1 (x0 didžiausiam, -2 kitam)', pessimisticZmkTotal(g, [4, 3]) === 1, String(pessimisticZmkTotal(g, [4, 3])))
}
{
  // Lethal su buff enableriu: 8 HP, ataka 4 + buff +4 -> 8
  const g = freshGame()
  g.you.hp = 8
  P(g, 'ai').gold = 500
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Vienas', uid: 'lb1', attack: 4 }), 5)
  P(g, 'ai').hand.push(mkCard({ name: 'Galia', uid: 'lb2', type: 'spell', gold: 200, mappings: [{ trigger: 'onCast', effect: 'buffAttack', target: 'ownUnit', value: 4, triggersZmk: false } as EffectMapping] }))
  const plan = computeGuaranteedLethal(g)
  check('lethal per buff enablerį (4+4=8)', plan.lethal && plan.needsBuff, JSON.stringify(plan))
  const ranked = decideAiTurn(g, { difficulty: 'hard', weights: { jitter: -1 } })
  const top = ranked[0]
  check('buff\'as rikiuojasi PIRMAS (prieš ataką)', top.descriptor.type === 'play' && top.reason.includes('lethal: buff'), `top=${top?.reason}`)
}
{
  // Taunt clear kelias: taunt 2 HP, likes puolejas i veida
  const g = freshGame()
  g.you.hp = 5
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Mazas', uid: 'lt1', attack: 3 }), 3)
  P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Didelis', uid: 'lt2', attack: 6 }), 6)
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Uztvara', uid: 'lt3', attack: 1, keywords: ['taunt'] as never }), 2)
  const plan = computeGuaranteedLethal(g)
  check('lethal per taunt clear (mažas nuima taunt, didelis į veidą)', plan.lethal && plan.tauntClear, JSON.stringify(plan))
}

console.log('◆ Reverse lethal (threat range)')
{
  const g = freshGame()
  P(g, 'ai').hp = 8
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Zudikas', uid: 'rv1', attack: 9 }), 8)
  const rl = reverseLethalRisk(g)
  check('kitą ėjimą gresia mirtis – atpažinta', rl.lethalNext, `incoming=${rl.incoming}`)
  const fsHard = faceScore(g, W_HARD)
  const fsNorm = faceScore(g, W_NORM)
  check('hard nelenktyniauja į veidą (baudžiama)', fsHard < fsNorm, `hard=${fsHard.toFixed(1)} norm=${fsNorm.toFixed(1)}`)
  // frozen priešas neskaičiuojamas į incoming
  P(g, 'you').units[0]!.statuses.frozen = 9999
  check('frozen puolėjas į threat range neskaičiuojamas', !reverseLethalRisk(g).lethalNext, `incoming=${reverseLethalRisk(g).incoming}`)
}

console.log('◆ Reaction bait')
{
  const g = freshGame()
  P(g, 'you').reactions[0] = { uid: 'rx1', card: mkCard({ name: 'Spastai', uid: 'rx1', type: 'reaction' }), paid: 0 }
  const pigus = mkUnit(mkCard({ name: 'Pigus', uid: 'ba1', attack: 2 }), 2)
  const brangus = mkUnit(mkCard({ name: 'Brangus', uid: 'ba2', attack: 6 }), 7)
  P(g, 'ai').units[0] = pigus
  P(g, 'ai').units[1] = brangus
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Gyneja', uid: 'ba3', attack: 2 }), 8)
  const sPigus = scoreAttack(g, pigus, { kind: 'unit', side: 'you', uid: 'ba3' }, W_HARD)
  const sPigusNoReact = (() => { const r = P(g, 'you').reactions[0]; P(g, 'you').reactions[0] = null; const v = scoreAttack(g, pigus, { kind: 'unit', side: 'you', uid: 'ba3' }, W_HARD); P(g, 'you').reactions[0] = r; return v })()
  check('pigus padaras „testuoja" reakciją (bonusas kai reakcija padėta)', sPigus > sPigusNoReact, `su=${sPigus.toFixed(1)} be=${sPigusNoReact.toFixed(1)}`)
  // brangiausias burtas laikomas, kol yra pigesnis
  P(g, 'ai').gold = 1000
  const brangusBurtas = mkCard({ name: 'Sunaikinimas', uid: 'bb1', type: 'spell', gold: 500, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 5, triggersZmk: false } as EffectMapping] })
  P(g, 'ai').hand.push(mkCard({ name: 'Pigus burtas', uid: 'bb2', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 1, triggersZmk: false } as EffectMapping] }))
  const scBrangus = scorePlayCard(g, brangusBurtas, W_HARD, false).score
  P(g, 'you').reactions[0] = null
  const scBrangusNoReact = scorePlayCard(g, brangusBurtas, W_HARD, false).score
  check('brangiausias burtas pridengiamas kol reakcija ant stalo', scBrangus < scBrangusNoReact, `su=${scBrangus.toFixed(1)} be=${scBrangusNoReact.toFixed(1)}`)
}

console.log('◆ Kill confirmation + removal biudžetas')
{
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Sveikas5', uid: 'kc1', attack: 3 }), 5)
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Suzeistas', uid: 'kc2', attack: 3, health: 5 }), 3)
  const dmg3 = mkCard({ name: 'Strele', uid: 'kc3', type: 'spell', mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 3, triggersZmk: false } as EffectMapping] })
  const res = scorePlayCard(g, dmg3, W_HARD, false)
  check('žala UŽBAIGIA sužeistą (kill confirmation), ne mėto ant sveiko', (res.opts?.target as { uid?: string } | undefined)?.uid === 'kc2', JSON.stringify(res.opts))
  // removal biudžetas: destroy ant taikinio, kuri nuima paprastas trade
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Trade padaras', uid: 'kc4', attack: 6 }), 8)
  const t1 = pickThreatTarget(g, W_HARD, true)
  const noTrade = (() => { P(g, 'ai').units[0] = null; const v = pickThreatTarget(g, W_HARD, true); return v })()
  check('premium removal taupomas kai yra pelningas trade', (t1.score < noTrade.score) || !t1.target, `su trade=${t1.score.toFixed(1)} be=${noTrade.score.toFixed(1)}`)
}

console.log('◆ Multi-target burtai (Žaibo iškrova tipo, VISI difficulty)')
{
  const { championAbilityTarget } = await import('../src/lib/tutorial/ai/aiScoring')
  const { playCard } = await import('../src/lib/tutorial/engine')
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'E1', uid: 'mt1', attack: 3 }), 4)
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'E2', uid: 'mt2', attack: 3 }), 4)
  P(g, 'you').units[2] = mkUnit(mkCard({ name: 'E3', uid: 'mt3', attack: 3 }), 4)
  const zaibas = mkCard({ name: 'Zaibo iskrova', uid: 'zi1', type: 'spell', gold: 0, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 4, hitCount: 2, requiresSelection: true, triggersZmk: false } as EffectMapping] })
  const res = scorePlayCard(g, zaibas, W_NORM, false)
  check('AI parenka VISUS N taikinių (targets.length=2)', (res.opts?.targets?.length ?? 0) === 2, JSON.stringify(res.opts))
  const single = scorePlayCard(g, mkCard({ name: 'Viena strele', uid: 'vs1', type: 'spell', gold: 0, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 4, requiresSelection: true, triggersZmk: false } as EffectMapping] }), W_NORM, false)
  check('multi-target vertinamas pagal SUMINĘ žalą (score > vieno smūgio)', res.score > single.score, `multi=${res.score.toFixed(1)} single=${single.score.toFixed(1)}`)
  // Realus sužaidimas: abu pasirinkti taikiniai gauna žalą
  P(g, 'ai').hand.push(zaibas)
  g.active = 'ai'
  const r = playCard(g, 'ai', 'zi1', { targets: res.opts!.targets })
  check('playCard su targets[] ok', r.ok, JSON.stringify(r))
  const alive = P(g, 'you').units.filter((u) => !!u)
  check('ABU pasirinkti taikiniai numušti (liko 1 gyvas)', alive.length === 1, `alive=${alive.map((u) => u!.uid).join(',')}`)
}
{
  // Čempiono skill hitCount>1 → targets[]
  const g = freshGame()
  P(g, 'you').units[0] = mkUnit(mkCard({ name: 'C1', uid: 'ct1', attack: 3 }), 4)
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'C2', uid: 'ct2', attack: 3 }), 4)
  const { championAbilityTarget } = await import('../src/lib/tutorial/ai/aiScoring')
  const tt = championAbilityTarget(g, [{ trigger: 'onChampionSkill', effect: 'damage', target: 'enemyUnit', value: 2, hitCount: 2, requiresSelection: true, triggersZmk: false } as EffectMapping], W_HARD, false)
  check('čempiono multi-skill grąžina targets[2]', (tt.targets?.length ?? 0) === 2, JSON.stringify(tt))
}

console.log(`\n${pass} ✓ / ${fail} ✗`)
process.exit(fail ? 1 : 0)
