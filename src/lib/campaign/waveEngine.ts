// ════════════════════════════════════════════════════════════════════════════
// Wave Encounter Engine (foundation)
// Turns ScenarioWave definitions into concrete spawn instructions for a turn.
// Turn-based (NOT real-time TD): each wave resolves to a set of units the
// runtime injects onto the enemy board, with optional warning text/voice/fx.
// ════════════════════════════════════════════════════════════════════════════

import type { ScenarioWave, ScenarioConfig } from './types'

export interface SpawnInstruction {
  waveId: string
  side: ScenarioWave['spawnSide']
  units: { cardId: string; attack?: number; health?: number }[]
  warningText?: string
  voiceLineUrl?: string
  fxKey?: string
  mustClear: boolean
}

export interface WaveRuntimeState {
  /** how many times each wave has spawned (for repeats/maxRepeats). */
  spawnCounts: Record<string, number>
}

export function initWaveState(): WaveRuntimeState {
  return { spawnCounts: {} }
}

function pickUnits(wave: ScenarioWave, rng: () => number): { cardId: string; attack?: number; health?: number }[] {
  const units: { cardId: string }[] = []
  for (const id of wave.exactUnits ?? []) units.push({ cardId: id })
  const pool = wave.unitPool ?? []
  const n = wave.randomCount ?? 0
  for (let i = 0; i < n && pool.length; i++) {
    units.push({ cardId: pool[Math.floor(rng() * pool.length)] })
  }
  const scale = wave.difficultyScale ?? 1
  return units.map((u) => scale === 1 ? u : { ...u, attack: undefined, health: undefined, _scale: scale } as never)
    .map((u) => ({ cardId: (u as { cardId: string }).cardId }))
}

/** Which waves should trigger on this turn (turn-based triggers only). */
export function wavesForTurn(
  cfg: ScenarioConfig, st: WaveRuntimeState, turn: number, rng: () => number = Math.random,
): SpawnInstruction[] {
  const out: SpawnInstruction[] = []
  for (const wave of cfg.waves ?? []) {
    if (wave.triggerType !== 'turn') continue
    if (wave.turn !== turn) {
      // support repeats: if past initial turn and repeats, fire every (delayBetween||1)
      if (!(wave.repeats && wave.turn != null && turn > wave.turn &&
            (turn - wave.turn) % Math.max(1, wave.delayBetween ?? 1) === 0)) continue
    }
    const count = st.spawnCounts[wave.id] ?? 0
    if (wave.maxRepeats != null && count >= wave.maxRepeats) continue
    st.spawnCounts[wave.id] = count + 1
    out.push(resolveWave(wave, rng))
  }
  return out
}

/** Resolve a single wave (used by scenario `spawnWave` actions and turn triggers). */
export function resolveWave(wave: ScenarioWave, rng: () => number = Math.random): SpawnInstruction {
  return {
    waveId: wave.id,
    side: wave.spawnSide,
    units: pickUnits(wave, rng),
    warningText: wave.warningText,
    voiceLineUrl: wave.voiceLineUrl,
    fxKey: wave.fxKey,
    mustClear: wave.mustClear ?? false,
  }
}

export function findWave(cfg: ScenarioConfig, waveId: string): ScenarioWave | undefined {
  return (cfg.waves ?? []).find((w) => w.id === waveId)
}

/** Are all must-clear waves defeated? (victory check for WAVE_DEFENSE). */
export function allMustClearDefeated(cfg: ScenarioConfig, defeatedWaveIds: Set<string>): boolean {
  const must = (cfg.waves ?? []).filter((w) => w.mustClear)
  if (!must.length) return false
  return must.every((w) => defeatedWaveIds.has(w.id))
}
