// ── Hard (goodPlayer) planavimo sluoksnis ────────────────────────────────────
// 1) PESIMISTINIS lethal solver: ar ŠĮ ėjimą galima GARANTUOTAI nužudyti
//    žaidėją, įskaitant enablerius (buff prieš ataką, taunt nuėmimas atakomis,
//    burn į veidą, čempiono skill). „Garantuotai" = blogiausiu realistiniu ŽMK
//    atveju: po vieną x0 ir −2 bei iki penkių −1 (specialusis permaišymas
//    teoriškai leistų x0 kaskart, bet tokia prielaida lethal'ą padarytų
//    neįmanomą – todėl kiekviena neigiama korta skaičiuojama po kartą).
// 2) Patikslintas priešo threat range (reverse lethal): frozen/stunned padarai
//    kitą ėjimą NEpuls, čempiono skill + rankos prognozė pagal dydį.
// DI NEMATO užverstų kortų – naudojama tik vieša informacija.

import type { GameState, BoardUnit } from '../engine'
import { P, effectiveAtk, canUnitAttack, canAfford, championSkills } from '../engine'
import { analyzeCard } from './aiCardRole'

function readyAttackers(g: GameState): BoardUnit[] {
  return P(g, 'ai').units.filter((u): u is BoardUnit => !!u && !u.isChampion && canUnitAttack(g, 'ai', u).ok)
}
function enemyTaunts(g: GameState): BoardUnit[] {
  return P(g, 'you').units.filter((u): u is BoardUnit =>
    !!u && !u.stealth && !u.statuses.silenced && (u.card.keywords.includes('taunt') || !!u.auraKw?.includes('taunt')))
}

/** Blogiausio atvejo ŽMK korekcija žalos instancijų sąrašui (didžiausios nukenčia pirmos). */
export function pessimisticZmkTotal(g: GameState, instances: number[]): number {
  const pool = [...P(g, 'ai').zmk, ...P(g, 'ai').zmkGrave]
  const sorted = [...instances].sort((a, b) => b - a)
  let x0 = pool.filter((v) => v === 'x0').length > 0 ? 1 : 0
  let m2 = pool.filter((v) => v === '-2').length > 0 ? 1 : 0
  let m1 = Math.min(5, pool.filter((v) => v === '-1').length)
  let total = 0
  for (const d of sorted) {
    if (x0 > 0) { x0--; total += 0; continue }
    if (m2 > 0) { m2--; total += Math.max(0, d - 2); continue }
    if (m1 > 0) { m1--; total += Math.max(0, d - 1); continue }
    total += d
  }
  return total
}

export type LethalPlan = {
  lethal: boolean
  guaranteed: number
  hp: number
  /** Ar planas reikalauja pirmiausia nukirsti taunt'us atakomis. */
  tauntClear: boolean
  /** Ar planas reikalauja buff'o prieš atakas (be jo žalos nepakanka). */
  needsBuff: boolean
}

/** Pesimistinis „ar turiu garantuotą lethal ŠĮ ėjimą" su enableriais. */
export function computeGuaranteedLethal(g: GameState): LethalPlan {
  const me = P(g, 'ai')
  const foe = P(g, 'you')
  const none: LethalPlan = { lethal: false, guaranteed: 0, hp: foe.hp, tauntClear: false, needsBuff: false }
  if (foe.hp <= 0) return { ...none, lethal: true }

  const attackers = readyAttackers(g)
  const taunts = enemyTaunts(g)

  // Taunt nuėmimas: pigiausi puolėjai (mažiausiu ATK), kurių suma numuša taunt HP.
  // Likę puolėjai eina į veidą. Burn į veidą taunt'o neblokuojamas.
  let faceUnits = [...attackers].sort((a, b) => effectiveAtk(g, b) - effectiveAtk(g, a))
  let tauntClear = false
  if (taunts.length > 0) {
    const spent: string[] = []
    for (const t of taunts) {
      let hpLeft = t.hp + (t.shield ? 9999 : 0)   // skydas anuliuoja visą smūgį – tokio taunt'o atakom nenuimsi
      // imam nuo SILPNIAUSIO puolėjo, kad stiprūs liktų veidui
      for (const u of [...faceUnits].sort((a, b) => effectiveAtk(g, a) - effectiveAtk(g, b))) {
        if (hpLeft <= 0) break
        if (spent.includes(u.uid)) continue
        spent.push(u.uid)
        hpLeft -= Math.max(0, effectiveAtk(g, u) - 1)  // pesimistiškai −1 kiekvienam taunt smūgiui
      }
      if (hpLeft > 0) return none                       // taunt'ų nenuimam – veido kelio nėra
    }
    faceUnits = faceUnits.filter((u) => !spent.includes(u.uid))
    tauntClear = true
  }

  // Aukso biudžetas burtams/buffams: burn'ai pagal žalą už auksą, tada buff'ai.
  let gold = me.gold
  const burn: number[] = []
  let buffAtk = 0
  const spells = me.hand
    .filter((c) => c.type === 'spell' && canAfford(g, 'ai', c))
    .map((c) => ({ c, a: analyzeCard(c) }))
    .sort((x, y) => (y.a.dmgEnemy - x.a.dmgEnemy))
  for (const { c, a } of spells) {
    if (a.canHitFace && a.dmgEnemy > 0 && !a.isAoE && c.gold <= gold) { gold -= c.gold; burn.push(a.dmgEnemy) }
  }
  for (const { c, a } of spells) {
    if (a.buffAtk > 0 && c.gold <= gold && faceUnits.length > 0) { gold -= c.gold; buffAtk += a.buffAtk }
  }

  // Čempiono skill žala (jei gali siekti veidą – kuklus patikrinimas per mapping'us)
  let champDmg = 0
  const champ = me.units.find((u) => u?.isChampion && !u.abilityUsed && !u.statuses.silenced && !u.statuses.frozen && !u.statuses.stunned)
  if (champ) {
    const sk = championSkills(champ)[Math.max(0, champ.phase - 1)]
    if (sk?.unlocked && (sk.goldCost ?? 0) <= gold) {
      for (const m of sk.mappings) {
        if (m.effect !== 'damage') continue
        const ts = (m.targetTypes && m.targetTypes.length > 0) ? m.targetTypes : [m.target]
        if (ts.some((t) => t === 'enemyPlayer' || t === 'anyPlayer' || t === 'allEnemyTargets')) champDmg = Math.max(champDmg, m.value ?? 1)
      }
      if (champDmg > 0) gold -= (sk.goldCost ?? 0)
    }
  }

  // Instancijos: veido atakos (buff'as ant stipriausio puolėjo) + burn + čempionas
  const instances: number[] = []
  faceUnits.forEach((u, i) => instances.push(effectiveAtk(g, u) + (i === 0 ? buffAtk : 0)))
  instances.push(...burn)
  if (champDmg > 0) instances.push(champDmg)
  if (instances.length === 0) return none

  const guaranteed = pessimisticZmkTotal(g, instances)
  const withoutBuff = pessimisticZmkTotal(g, [
    ...faceUnits.map((u) => effectiveAtk(g, u)), ...burn, ...(champDmg > 0 ? [champDmg] : []),
  ])
  return {
    lethal: guaranteed >= foe.hp,
    guaranteed, hp: foe.hp, tauntClear,
    needsBuff: buffAtk > 0 && withoutBuff < foe.hp && guaranteed >= foe.hp,
  }
}

/** Patikslintas priešo žalos diapazonas KITAM ėjimui (reverse lethal, tik vieša info). */
export function incomingNextTurn(g: GameState): number {
  const foe = P(g, 'you')
  let dmg = 0
  for (const u of foe.units) {
    if (!u || u.isChampion) continue
    // frozen/stunned uždėtas MŪSŲ ėjime kausto visą priešo ėjimą – jis nepuls
    if (u.statuses.frozen || u.statuses.stunned) continue
    dmg += effectiveAtk(g, u)
  }
  const champ = foe.units.find((u) => u?.isChampion && !u.statuses.silenced)
  if (champ) dmg += Math.max(1, champ.phase)          // skill žalos prielaida ~fazė
  dmg += Math.min(4, foe.hand.length)                 // rankos burn/buff prognozė pagal dydį
  return dmg
}

/** Ar AI kitą ėjimą realiai gali žūti (naudoja patikslintą diapazoną). */
export function reverseLethalRisk(g: GameState): { lethalNext: boolean; incoming: number } {
  const incoming = incomingNextTurn(g)
  return { lethalNext: incoming >= P(g, 'ai').hp, incoming }
}
