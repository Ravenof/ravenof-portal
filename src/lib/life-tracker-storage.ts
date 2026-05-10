import type { GameMode, GameState } from '@/types/life-tracker'

const STORAGE_KEY = 'ravenof_life_tracker_v1'

export function defaultState(mode: GameMode = '1v1'): GameState {
  return {
    mode,
    names: mode === '1v1' ? ['Player 1', 'Player 2'] : ['Team 1', 'Team 2'],
    hp: mode === '1v1' ? [40, 40] : [60, 60],
    turn: 1,
    activeSide: 0,
    log: [],
    soundEnabled: true,
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (!parsed.mode || !Array.isArray(parsed.hp) || !Array.isArray(parsed.names)) return null
    return parsed
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
