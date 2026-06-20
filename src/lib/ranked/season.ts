// ── Ravenof Reitingo kova — sezonai ──────────────────────────────────────────
// Sezonas trunka 3 mėnesius. Sezono pabaigoje rangas resetinamas pagal galutinį rankStep.

import { clampStep } from './rank'

export const SEASON_LENGTH_DAYS = 90
export const SEASON_ENDING_WARN_DAYS = 7

/** Sezono reset: galutinis rankStep → naujo sezono pradinis rankStep. */
export function seasonResetStep(finalStep: number): number {
  const s = clampStep(finalStep)
  if (s <= 29) return clampStep(0)               // 50 Bronza
  if (s <= 59) return clampStep(15)              // 45 Bronza
  if (s <= 89) return clampStep(30)              // 40 Bronza
  if (s <= 119) return clampStep(45)             // 35 Bronza
  return clampStep(60)                           // 30 Bronza
}

export type SeasonTimer = {
  endsAt: Date
  msLeft: number
  daysLeft: number
  hoursLeft: number
  endingSoon: boolean
  ended: boolean
}

export function seasonTimer(endDate: string | Date, now: Date = new Date()): SeasonTimer {
  const endsAt = typeof endDate === 'string' ? new Date(endDate) : endDate
  const msLeft = endsAt.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.floor(msLeft / 86_400_000))
  const hoursLeft = Math.max(0, Math.floor((msLeft % 86_400_000) / 3_600_000))
  return {
    endsAt,
    msLeft,
    daysLeft,
    hoursLeft,
    endingSoon: msLeft > 0 && daysLeft < SEASON_ENDING_WARN_DAYS,
    ended: msLeft <= 0,
  }
}

export function formatTimeLeft(t: SeasonTimer): string {
  if (t.ended) return 'Sezonas baigėsi'
  if (t.daysLeft > 0) return `${t.daysLeft} d. ${t.hoursLeft} val.`
  return `${t.hoursLeft} val.`
}
