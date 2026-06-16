// ── Grėsmės / išgyvenimo / lethal vertinimas ─────────────────────────────────

import type { GameState, BoardUnit, Side } from '../engine'
import { P, effectiveAtk, canUnitAttack, canAfford } from '../engine'
import { unitThreat, analyzeCard } from './aiCardRole'

/** Pusės lentos grėsmė: padarų atakos jėga + raktažodžiai + pasyvai. */
export function evaluateBoardThreat(g: GameState, side: Side): number {
  const p = P(g, side)
  let t = 0
  for (const u of p.units) {
    if (!u || u.statuses.frozen || u.statuses.stunned) continue
    t += unitThreat(g, u)
  }
  return t
}

/** Padarai, galintys atakuoti DABAR (jau lentoje, be summoning sickness). */
function readyAttackers(g: GameState, side: Side): BoardUnit[] {
  const p = P(g, side)
  return p.units.filter((u): u is BoardUnit => !!u && !u.isChampion && canUnitAttack(g, side, u).ok)
}

/** Ar pusė turi Pasišaipymo padarą (blokuoja veidą). */
function hasTaunt(g: GameState, side: Side): boolean {
  return P(g, side).units.some((u) => !!u && !u.stealth && (u.card.keywords.includes('taunt') || !!u.auraKw?.includes('taunt')))
}

/** Apytikslė priešo (žaidėjo) žala AI kitą ėjimą (lentos ataka + maža rankos prognozė). */
export function enemyPotentialDamageNextTurn(g: GameState): number {
  const foe = P(g, 'you')
  let dmg = 0
  for (const u of foe.units) {
    if (!u || u.isChampion) continue
    dmg += effectiveAtk(g, u)
  }
  // maža prognozė: žaidėjas gali turėti burn rankoje (kuklus įvertis)
  dmg += Math.min(3, foe.hand.length)
  return dmg
}

export type SurvivalRisk = { risk: boolean; incoming: number; lethalNext: boolean }

/** Ar AI rizikuoja žūti kitą ėjimą. */
export function evaluateSurvivalRisk(g: GameState): SurvivalRisk {
  const me = P(g, 'ai')
  const incoming = enemyPotentialDamageNextTurn(g)
  return { risk: incoming >= me.hp * 0.6, incoming, lethalNext: incoming >= me.hp }
}

/** Žala į veidą, kurią AI gali padaryti DABAR (atakos, jei neblokuoja Pasišaipymas). */
function faceDamageAvailableNow(g: GameState): number {
  if (hasTaunt(g, 'you')) return 0
  return readyAttackers(g, 'ai').reduce((s, u) => s + effectiveAtk(g, u), 0)
}

/** Burn į veidą iš rankos (įperkami burtai, kurių žala pasiekia žaidėją). */
function burnToFaceAvailable(g: GameState): number {
  const me = P(g, 'ai')
  let dmg = 0
  for (const c of me.hand) {
    if (c.type !== 'spell' || !canAfford(g, 'ai', c)) continue
    const a = analyzeCard(c)
    if (a.canHitFace && a.dmgEnemy > 0 && !a.isAoE) dmg += a.dmgEnemy
  }
  return dmg
}

/** Ar AI gali nužudyti žaidėją šį ėjimą (kuklus įvertis: bazinės reikšmės). */
export function hasLethalThisTurn(g: GameState): boolean {
  const foe = P(g, 'you')
  if (foe.hp <= 0) return true
  const total = faceDamageAvailableNow(g) + burnToFaceAvailable(g)
  return total >= foe.hp
}

export { hasTaunt }
