// Prisijungimo ciklo išvestiniai rodikliai (serija, praleistos dienos, šį mėnesį
// pasiekiama diena). rvn_get_login_cycle jų negrąžina, todėl skaičiuojam iš
// atsiėmimo datų (UTC paros – kaip serveryje). Jei serveris kada nors pradės
// grąžinti streak/missedDays – jo reikšmės paliekamos.
import type { LoginRewardState } from './types'

const DAY = 86400000
const utcDay = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? Math.floor(ms / DAY) : null
}

export type LoginStats = { streak: number; missedDays: number; reachableDay: number }

export function computeLoginStats(s: LoginRewardState): LoginStats {
  const today = utcDay(s.serverTime) ?? Math.floor(Date.now() / DAY)
  const days = new Set<number>()
  for (const d of s.rewards ?? []) { const n = utcDay(d.claimedAt); if (n != null) days.add(n) }

  // Serija: paeiliui einančios paros iki šiandien (arba iki vakar, jei šiandien dar neatsiimta)
  let streak = 0
  let cur = days.has(today) ? today : today - 1
  while (days.has(cur)) { streak++; cur-- }

  // Ciklas = kalendorinis mėnuo (UTC)
  const now = new Date(today * DAY)
  const monthStart = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / DAY)
  const monthEnd = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / DAY) // kito mėn. 1 d.
  const start = Math.max(monthStart, utcDay(s.cycleStartedAt) ?? monthStart)
  const claimedToday = s.claimedToday || days.has(today)
  const elapsed = today - start + (claimedToday ? 1 : 0) // jau praėjusios paros (šiandien – tik jei atsiimta)
  const missedDays = Math.max(0, elapsed - (s.cyclePosition ?? 0))
  const left = monthEnd - today - (claimedToday ? 1 : 0)  // dar galimi atsiėmimai šį mėnesį
  const reachableDay = Math.min(s.cycleLength ?? 0, (s.cyclePosition ?? 0) + Math.max(0, left))
  return { streak, missedDays, reachableDay }
}

/** Užpildo streak/missedDays, jei serveris jų negrąžino. */
export function withLoginStats<T extends LoginRewardState>(s: T): T {
  if (!s || !Array.isArray(s.rewards)) return s
  const st = computeLoginStats(s)
  return {
    ...s,
    streak: typeof s.streak === 'number' ? s.streak : st.streak,
    missedDays: typeof s.missedDays === 'number' ? s.missedDays : st.missedDays,
  }
}
