// ── Ravenof Reitingo kova — garso įvykių kabliukai (file-first) ──────────────
// Kiekvienas įvykis pirmiausia bando groti mp3 iš /sounds/ranked/<event>.mp3.
// Jei failo nėra — fallback į esamą portalo UI garsą (ui-sound). Įkėlus failus
// kodo keisti nereikia.

import { isUiSoundEnabled, playUiClick, playSuccess, playError, playPanelOpen, playDiscovery, playCardFlip } from '@/lib/ui-sound'

export type RankedSoundEvent =
  | 'ranked_queue_start'
  | 'ranked_queue_cancel'
  | 'ranked_match_found'
  | 'ranked_match_start'
  | 'ranked_win'
  | 'ranked_loss'
  | 'ranked_rank_up'
  | 'ranked_rank_down'
  | 'ranked_reward_claim'
  | 'ranked_achievement_unlock'
  | 'ranked_season_end'
  | 'ranked_season_reward'

const FALLBACK: Record<RankedSoundEvent, () => void> = {
  ranked_queue_start: playPanelOpen,
  ranked_queue_cancel: playUiClick,
  ranked_match_found: playDiscovery,
  ranked_match_start: playCardFlip,
  ranked_win: playSuccess,
  ranked_loss: playError,
  ranked_rank_up: playSuccess,
  ranked_rank_down: playError,
  ranked_reward_claim: playSuccess,
  ranked_achievement_unlock: playDiscovery,
  ranked_season_end: playPanelOpen,
  ranked_season_reward: playSuccess,
}

const dead = new Set<string>()
const pool = new Map<string, HTMLAudioElement>()

export function playRanked(event: RankedSoundEvent, volume = 0.5): void {
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return
  const url = `/sounds/ranked/${event}.mp3`
  if (dead.has(url)) { FALLBACK[event]?.(); return }
  try {
    let a = pool.get(url)
    if (!a) {
      a = new Audio(url)
      a.preload = 'auto'
      a.addEventListener('error', () => { dead.add(url); pool.delete(url); FALLBACK[event]?.() })
      pool.set(url, a)
    }
    a.volume = volume
    a.currentTime = 0
    const p = a.play()
    if (p && typeof p.catch === 'function') p.catch(() => { dead.add(url); FALLBACK[event]?.() })
  } catch {
    dead.add(url)
    FALLBACK[event]?.()
  }
}
