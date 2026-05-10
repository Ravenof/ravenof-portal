import type { GameMode, GameState } from '@/types/life-tracker'

const STORAGE_KEY = 'ravenof_life_tracker_v1'

export function defaultState(mode: GameMode = '1v1'): GameState {
  const maxHp = mode === '1v1' ? 40 : 60
  return {
    mode,
    names: mode === '1v1' ? ['Player 1', 'Player 2'] : ['Team 1', 'Team 2'],
    hp: [maxHp, maxHp],
    maxHp,
    round: 1,
    activeSide: 0,
    log: [],
    soundEnabled: true,
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>

    // Migration: old state had `turn` instead of `round`
    if ('turn' in parsed && !('round' in parsed)) {
      parsed.round = parsed.turn
    }

    // Migration: add maxHp if missing
    if (!('maxHp' in parsed) || typeof parsed.maxHp !== 'number') {
      parsed.maxHp = parsed.mode === '2v2' ? 60 : 40
    }

    const state = parsed as GameState
    if (!state.mode || !Array.isArray(state.hp) || !Array.isArray(state.names)) return null
    return state
  } catch {
    return null
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota/security errors
  }
}
