// ── Field engine ──────────────────────────────────────────────────────────────
// Lauko kortų pasyvūs modifikatoriai + trigger'iai. Vienu metu aktyvi viena
// lauko korta, veikia abu žaidėjus (nebent affectsBothPlayers=false – tada tik
// savininką). Pasyvai skaitomi tiesiai iš state, trigger'ius vykdo engine.

import type { FieldEffectConfig, FieldPassiveConfig, EffectMapping } from './types'
import type { GameState, Side } from '@/lib/tutorial/engine'

export function fieldConfig(g: GameState): FieldEffectConfig | null {
  return g.field?.card.gameplay?.fieldEffectConfig ?? null
}

function passive(g: GameState, forSide: Side): FieldPassiveConfig | null {
  const cfg = fieldConfig(g)
  if (!cfg?.passive) return null
  if (cfg.affectsBothPlayers === false && g.field?.owner !== forSide) return null
  return cfg.passive
}

/** Burtų kainos pokytis (pvz. „burtai kainuoja +100"). */
export function spellCostDelta(g: GameState, s: Side): number {
  return passive(g, s)?.spellCostDelta ?? 0
}

/** Padarų kainos pokytis. */
export function unitCostDelta(g: GameState, s: Side): number {
  return passive(g, s)?.unitCostDelta ?? 0
}

/** Visų padarų ATK pokytis (legacy: parsed buffAtk iš lauko teksto irgi veikia). */
export function fieldAtkDelta(g: GameState, ownerSide: Side): number {
  const fromCfg = passive(g, ownerSide)?.atkDelta ?? 0
  const legacy = g.field?.card.gameplay?.fieldEffectConfig ? 0 : (g.field?.card.effect?.buffAtk ?? 0)
  return fromCfg + legacy
}

/** Atakų limitas per ėjimą (pvz. „galima atakuoti tik su 2 padarais"). */
export function attackLimit(g: GameState, s: Side): number {
  return passive(g, s)?.attackLimitPerTurn ?? Infinity
}

/** Papildomas auksas ėjimo pradžioje. */
export function fieldGoldBonus(g: GameState, s: Side): number {
  return passive(g, s)?.goldBonusPerTurn ?? 0
}

/** Padarų zonos limitas (default 5; Platusis laukas pakelia iki 10). */
export function creatureCap(g: GameState, s: Side): number {
  return passive(g, s)?.creatureCap ?? 5
}

/** Pirmos žalos per ėjimą sumažinimas. Grąžina sumažintą žalą ir ar suveikė. */
export function applyFirstDamageReduction(g: GameState, receiverSide: Side, dmg: number): { dmg: number; reduced: boolean } {
  const p = passive(g, receiverSide)
  const r = p?.firstDamageReduction ?? 0
  if (r <= 0 || dmg <= 0) return { dmg, reduced: false }
  const rp = receiverSide === 'you' ? g.you : g.ai
  if (rp.fieldDamageReducedThisTurn) return { dmg, reduced: false }
  rp.fieldDamageReducedThisTurn = true
  return { dmg: Math.max(0, dmg - r), reduced: true }
}

/** Kovos šūksniai kartojami 2×. */
export function battlecryTwice(g: GameState, s: Side): boolean { return !!passive(g, s)?.battlecryTwice }
/** Iškviestas padaras su Paskutiniu noru žūsta iškart. */
export function destroySummonedWithLastwish(g: GameState, s: Side): boolean { return !!passive(g, s)?.destroySummonedWithLastwish }
/** Sunaikintos kortos šalinamos iš žaidimo (ne į kapinyną). */
export function exileOnDeath(g: GameState, s: Side): boolean { return !!passive(g, s)?.exileOnDeath }
/** Žaidėjo pulti negalima, kol jis turi padarų. */
export function unitsGuardPlayer(g: GameState, s: Side): boolean { return !!passive(g, s)?.unitsGuardPlayer }
/** Visi (paveiktos pusės) padarai nutildyti, kol laukas aktyvus. */
export function globalSilence(g: GameState, s: Side): boolean { return !!passive(g, s)?.globalSilence }
/** Ėjimo pradžioje žaidėjas grąžina vieną savo padarą į ranką. */
export function returnUnitAtTurnStart(g: GameState, s: Side): boolean { return !!passive(g, s)?.returnUnitAtTurnStart }

/** Lauko trigger'iai pagal trigger tipą. */
export function fieldTriggers(g: GameState, trigger: string): EffectMapping[] {
  return (fieldConfig(g)?.triggers ?? []).filter((m) => m.trigger === trigger)
}
