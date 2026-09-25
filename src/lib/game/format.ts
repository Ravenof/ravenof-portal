// ── Kovos FORMATAS: ŽMK (numatytasis) arba KLASIKA (be modifikatorių) ───────
// Vienas globalus pasirinkimas visam /digital: hub'o tab'ai jį perjungia, o
// PvE / draugiška PvP / Reitingo kova skaito. Klasikoje ŽMK kaladė nesudaroma,
// žala visada lygi kortų vertėms (variklyje `GameState.format`), reitingas ir
// matchmaking'o eilės — ATSKIRI (Klasika turi savo `ranked_seasons` sezoną).
// Įsimenama localStorage (`rvn-format`); SSR/pirmas renderis — 'zmk'.
import { useSyncExternalStore } from 'react'

export type BattleFormat = 'zmk' | 'classic'
export const BATTLE_FORMATS: BattleFormat[] = ['zmk', 'classic']
const KEY = 'rvn-format'
const EVT = 'rvn-format-change'

function read(): BattleFormat {
  if (typeof window === 'undefined') return 'zmk'
  try { return window.localStorage.getItem(KEY) === 'classic' ? 'classic' : 'zmk' } catch { return 'zmk' }
}

let cur: BattleFormat | null = null

export function getBattleFormat(): BattleFormat {
  if (cur == null) cur = read()
  return cur
}

export function setBattleFormat(f: BattleFormat): void {
  cur = f
  try { window.localStorage.setItem(KEY, f) } catch { /* privatus režimas */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT))
}

export const isClassicFormat = (): boolean => getBattleFormat() === 'classic'

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb)
  window.addEventListener('storage', cb)
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener('storage', cb) }
}

/** React hook — perrenderina perjungus formatą (hub tab'ai, ekranų antraštės). */
export function useBattleFormat(): BattleFormat {
  return useSyncExternalStore(subscribe, getBattleFormat, () => 'zmk')
}

/** Vizualinis Klasikos akcentas (plienas) — vietoj aukso ŽMK kovoms. */
export const CLASSIC_ACCENT = '150,178,214'
