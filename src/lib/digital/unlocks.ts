// ══════════════════════════════════════════════════════════════════════════════
// REŽIMŲ ATRAKINIMAS PAGAL PASKYROS LYGĮ (848) — vienas šaltinis visam /digital.
// Serveris (rvn_get_unlocks) pasako: žaidėjo lygį, ar jam viskas atvira (paskyra
// sukurta iki pertvarkos, adminas, testeris) ir nuo kurio lygio kas atrakinama.
//
// SVARBU — „fail-open": kol duomenys nepakrauti arba RPC dar nėra (migracija
// nepaleista), NIEKAS neužrakinama. Užraktas per klaidą blogiau nei jo nebuvimas.
// Reitingo eilę papildomai saugo serverio trigeris (trg_ranked_queue_unlock).
// ══════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type UnlockFeature =
  | 'daily' | 'deckBuilder' | 'pveNormal' | 'friends' | 'ranked' | 'season'
  | 'pveHard' | 'classic' | 'deckPublish' | 'tournaments'

type UnlockState = {
  loaded: boolean
  level: number
  allOpen: boolean
  features: Partial<Record<UnlockFeature, number>>
  refresh: (opts?: { force?: boolean }) => Promise<void>
}

let inflight: Promise<void> | null = null
let lastFetch = 0
const MIN_INTERVAL_MS = 5_000

export const useUnlocks = create<UnlockState>((set) => ({
  loaded: false,
  level: 1,
  allOpen: false,
  features: {},
  refresh: async (opts) => {
    if (inflight) return inflight
    if (!opts?.force && Date.now() - lastFetch < MIN_INTERVAL_MS) return
    inflight = (async () => {
      try {
        const { data, error } = await createClient().rpc('rvn_get_unlocks')
        const d = data as { level?: number; allOpen?: boolean; features?: Record<string, number> } | null
        if (error || !d || typeof d.level !== 'number') return // lieka „viskas atvira"
        set({ loaded: true, level: d.level, allOpen: !!d.allOpen, features: (d.features ?? {}) as UnlockState['features'] })
        lastFetch = Date.now()
      } catch { /* fail-open */ } finally { inflight = null }
    })()
    return inflight
  },
}))

export type FeatureLock = { locked: boolean; required: number; level: number }

export function featureLock(s: Pick<UnlockState, 'loaded' | 'level' | 'allOpen' | 'features'>, f: UnlockFeature): FeatureLock {
  const required = s.features[f] ?? 1
  const locked = s.loaded && !s.allOpen && required > 1 && s.level < required
  return { locked, required, level: s.level }
}

/** React hook'as: ar funkcija šiam žaidėjui dar užrakinta. */
export function useFeatureLock(f: UnlockFeature): FeatureLock {
  const loaded = useUnlocks((s) => s.loaded)
  const allOpen = useUnlocks((s) => s.allOpen)
  const level = useUnlocks((s) => s.level)
  const required = useUnlocks((s) => s.features[f] ?? 1)
  return { locked: loaded && !allOpen && required > 1 && level < required, required, level }
}

/** Maršrutas → funkcija (tik tie ekranai, kurie užrakinami ištisai). */
export function featureForPath(pathname: string): UnlockFeature | null {
  if (pathname.startsWith('/digital/ranked')) return 'ranked'
  if (pathname.startsWith('/digital/season')) return 'season'
  if (pathname.startsWith('/digital/quests') || pathname.startsWith('/digital/rewards')) return 'daily'
  if (pathname.startsWith('/digital/friends') || pathname.startsWith('/digital/pvp')) return 'friends'
  return null
}
