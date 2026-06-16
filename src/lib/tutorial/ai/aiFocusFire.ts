// ── Focus-fire / cumulative damage planner ───────────────────────────────────
// Sprendžia esminį AI trūkumą: jei priešo padaro negalima nužudyti VIENU smūgiu,
// AI vis tiek turi vertinti BENDRĄ žalą per seką (keli puolėjai + burtai + buffai
// + čempiono skill) ir suplanuoti kill arba prasmingą partial damage – ypač į
// Pasišaipymo padarą, kuris blokuoja veidą.

import type { GameState, BoardUnit, TargetRef } from '../engine'
import { P, effectiveAtk, canUnitAttack, canAfford, championSkills } from '../engine'
import type { AiWeights } from './aiTypes'
import type { ScoredAction } from './aiActions'
import { analyzeCard, unitValue, unitThreatBonus } from './aiCardRole'
import { hasTaunt, evaluateSurvivalRisk } from './aiThreatEvaluation'

type Step =
  | { kind: 'attack'; uid: string; cardName: string; damage: number; dies: boolean }
  | { kind: 'spell'; uid: string; cardName: string; damage: number }
  | { kind: 'champ'; skillIndex: number; damage: number }
  | { kind: 'buff'; uid: string; cardName: string; boostUid: string }

type FocusPlan = { steps: Step[]; total: number; canKill: boolean; ownLoss: number; resourceCost: number }

function enemyUnits(g: GameState): BoardUnit[] {
  return P(g, 'you').units.filter((u): u is BoardUnit => !!u && !u.stealth)
}
function isTaunt(u: BoardUnit): boolean {
  return u.card.keywords.includes('taunt') || !!u.auraKw?.includes('taunt')
}
function readyAttackers(g: GameState): BoardUnit[] {
  return P(g, 'ai').units.filter((u): u is BoardUnit => !!u && !u.isChampion && canUnitAttack(g, 'ai', u).ok)
}
function attackerDies(g: GameState, attacker: BoardUnit, def: BoardUnit): boolean {
  if (attacker.shield) return false
  if (def.statuses.frozen) return false
  const defAtk = def.isChampion ? 0 : effectiveAtk(g, def)
  return defAtk >= attacker.hp
}

/** Čempiono žalos skill (jei paruoštas). */
function champDamageSource(g: GameState): { skillIndex: number; damage: number } | null {
  const champ = P(g, 'ai').units.find((u) => u?.isChampion && !u.abilityUsed && !u.statuses.silenced && !u.statuses.frozen && !u.statuses.stunned)
  if (!champ) return null
  const skills = championSkills(champ)
  const skillIndex = Math.max(0, champ.phase - 1)
  const sk = skills[skillIndex]
  if (!sk || !sk.unlocked) return null
  let dmg = 0
  for (const m of sk.mappings) if (m.effect === 'damage') dmg = Math.max(dmg, m.value ?? 1)
  return dmg > 0 ? { skillIndex, damage: dmg } : null
}

/** Visi galimi žalos šaltiniai į konkretų priešo padarą. */
function getDamageSources(g: GameState, def: BoardUnit) {
  const me = P(g, 'ai')
  const spells: { uid: string; cardName: string; damage: number }[] = []
  const buffs: { uid: string; cardName: string; buffAtk: number }[] = []
  for (const c of me.hand) {
    if (c.type !== 'spell' || !canAfford(g, 'ai', c)) continue
    const a = analyzeCard(c)
    const dmg = a.dmgEnemy > 0 && a.targetsEnemyUnit ? a.dmgEnemy : (a.isAoE ? a.aoeDmg : 0)
    if (dmg > 0) spells.push({ uid: c.uid, cardName: c.name, damage: dmg })
    if (a.buffAtk > 0) buffs.push({ uid: c.uid, cardName: c.name, buffAtk: a.buffAtk })
  }
  const champ = champDamageSource(g)
  const attacks = readyAttackers(g).map((u) => ({ uid: u.uid, cardName: u.card.name, damage: effectiveAtk(g, u), dies: attackerDies(g, u, def), unit: u }))
  return { spells, buffs, champ, attacks }
}

/** Bendra galima žala į taikinį (visi šaltiniai sudėti). */
export function calculateTotalAvailableDamageToTarget(g: GameState, def: BoardUnit): number {
  const s = getDamageSources(g, def)
  const spellDmg = s.spells.reduce((a, x) => a + x.damage, 0)
  const champDmg = s.champ ? s.champ.damage : 0
  const atkDmg = s.attacks.reduce((a, x) => a + x.damage, 0)
  const buffDmg = (s.buffs.length > 0 && s.attacks.length > 0) ? s.buffs[0].buffAtk : 0
  return spellDmg + champDmg + atkDmg + buffDmg
}

/** Minimali seka, nužudanti taikinį (jei įmanoma). Eiliškumas: burtai → skill → buff → atakos. */
export function findFocusFirePlan(g: GameState, def: BoardUnit): FocusPlan {
  const s = getDamageSources(g, def)
  const steps: Step[] = []
  let total = 0
  let ownLoss = 0
  let resourceCost = 0
  const hp = def.hp

  // 1) Atakos, kurios IŠGYVENA – nemokama žala, jokio praradimo
  for (const at of [...s.attacks].filter((a) => !a.dies).sort((a, b) => b.damage - a.damage)) {
    if (total >= hp) break
    steps.push({ kind: 'attack', uid: at.uid, cardName: at.cardName, damage: at.damage, dies: false }); total += at.damage
  }
  // 2) Čempiono skill (be praradimo)
  if (total < hp && s.champ) { steps.push({ kind: 'champ', skillIndex: s.champ.skillIndex, damage: s.champ.damage }); total += s.champ.damage }
  // 3) Burtai (resursas, bet be padaro praradimo)
  for (const sp of [...s.spells].sort((a, b) => b.damage - a.damage)) {
    if (total >= hp) break
    steps.push({ kind: 'spell', uid: sp.uid, cardName: sp.cardName, damage: sp.damage }); total += sp.damage; resourceCost += 2
  }
  // 4) Atakos, kurios žūsta – paskutinės (paaukojam tik kiek būtina)
  for (const at of [...s.attacks].filter((a) => a.dies).sort((a, b) => b.damage - a.damage)) {
    if (total >= hp) break
    steps.push({ kind: 'attack', uid: at.uid, cardName: at.cardName, damage: at.damage, dies: true }); total += at.damage
    ownLoss += unitValue(g, at.unit)
  }
  // 5) Buff enabler – jei vis dar trūksta ir yra buffas + puolėjas
  if (total < hp && s.buffs.length > 0 && s.attacks.length > 0) {
    const strongest = [...s.attacks].sort((a, b) => b.damage - a.damage)[0]
    const inPlan = steps.some((st) => st.kind === 'attack' && st.uid === strongest.uid)
    if (!inPlan) { steps.push({ kind: 'attack', uid: strongest.uid, cardName: strongest.cardName, damage: strongest.damage, dies: strongest.dies }); total += strongest.damage; if (strongest.dies) ownLoss += unitValue(g, strongest.unit) }
    const bf = s.buffs[0]
    steps.unshift({ kind: 'buff', uid: bf.uid, cardName: bf.cardName, boostUid: strongest.uid }); total += bf.buffAtk; resourceCost += 2
  }
  return { steps, total, canKill: total >= hp, ownLoss, resourceCost }
}

/** Focus-fire plano įvertinimas. */
export function scoreFocusFirePlan(g: GameState, def: BoardUnit, plan: FocusPlan): number {
  const targetValue = unitValue(g, def)
  const tauntBonus = isTaunt(def) ? 8 : 0
  const threatBonus = unitThreatBonus(g, def)
  const lethalPrevention = evaluateSurvivalRisk(g).risk ? 10 : 0
  const opensFace = isTaunt(def) ? 3 : 0
  const overkill = Math.max(0, plan.total - def.hp) * 0.3
  return targetValue + tauntBonus + threatBonus + lethalPrevention + opensFace - plan.ownLoss - plan.resourceCost - overkill
}

/** Geriausias partial-damage žingsnis (ataka) į taikinį, kai nužudyti negalima. */
function bestPartialAttack(g: GameState, def: BoardUnit, w: AiWeights): { step: Step; score: number } | null {
  const faceBlocked = hasTaunt(g, 'you')
  let best: { step: Step; score: number } | null = null
  for (const at of getDamageSources(g, def).attacks) {
    const dmg = Math.min(at.damage, def.hp)
    if (dmg <= 0) continue
    const remaining = def.hp - dmg
    let score = dmg * 0.6 + unitThreatBonus(g, def) * 0.4 + (isTaunt(def) ? 3 : 0)
    if (remaining <= 2) score += 2
    if (at.dies) score -= unitValue(g, at.unit) * 0.7
    // Pasišaipymas blokuoja veidą – bet koks žalingas žingsnis geriau nei nieko
    if (isTaunt(def) && faceBlocked) score = Math.max(score, 0.5)
    if (!best || score > best.score) best = { step: { kind: 'attack', uid: at.uid, cardName: at.cardName, damage: at.damage, dies: at.dies }, score }
  }
  void w
  return best
}

function stepToAction(g: GameState, def: BoardUnit, step: Step, score: number): ScoredAction {
  const tgt: TargetRef = { kind: 'unit', side: 'you', uid: def.uid }
  if (step.kind === 'attack') {
    return { descriptor: { type: 'attack', uid: step.uid, cardName: step.cardName, target: tgt }, score: score + (step.dies ? 0.1 : 0.3), reason: `focus-fire: „${step.cardName}" → „${def.card.name}"` }
  }
  if (step.kind === 'spell') {
    return { descriptor: { type: 'play', uid: step.uid, cardName: step.cardName, opts: { target: tgt } }, score: score + 0.5, reason: `focus-fire: burtas „${step.cardName}" → „${def.card.name}"` }
  }
  if (step.kind === 'champ') {
    return { descriptor: { type: 'ability', skillIndex: step.skillIndex, target: tgt }, score: score + 0.4, reason: `focus-fire: čempiono skill → „${def.card.name}"` }
  }
  // buff – taikomas į savo puolėją
  return { descriptor: { type: 'play', uid: step.uid, cardName: step.cardName, opts: { target: { kind: 'unit', side: 'ai', uid: step.boostUid } } }, score: score + 0.6, reason: `focus-fire: buff „${step.cardName}" prieš ataką` }
}

/** Pagrindinis: sugeneruoja focus-fire veiksmų kandidatus (kill planai + taunt chip). */
export function planFocusFire(g: GameState, w: AiWeights): ScoredAction[] {
  const out: ScoredAction[] = []
  const faceBlocked = hasTaunt(g, 'you')
  const risk = evaluateSurvivalRisk(g).risk
  for (const def of enemyUnits(g)) {
    const taunt = isTaunt(def)
    const threat = unitThreatBonus(g, def)
    const plan = findFocusFirePlan(g, def)
    if (plan.canKill) {
      const sc = scoreFocusFirePlan(g, def, plan)
      if (sc <= 0) continue
      for (const step of plan.steps) out.push(stepToAction(g, def, step, sc))
      continue
    }
    // Negalim nužudyti – ar verta partial damage?
    const worthPartial = (taunt && faceBlocked) || risk || (threat >= 3)
    if (!worthPartial) continue
    const chip = bestPartialAttack(g, def, w)
    if (chip && chip.score > 0) out.push(stepToAction(g, def, chip.step, chip.score))
  }
  return out
}
