'use client'

// ── Fog-of-war: aplankytų lokacijų sekimas (localStorage) ─────────────────────

const KEY = 'ravenof-lore-discovered'

export function getDiscovered(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

/** Pažymi lokaciją kaip atrastą. Grąžina true, jei tai NAUJAS atradimas. */
export function markDiscovered(id: string): boolean {
  const set = getDiscovered()
  if (set.has(id)) return false
  set.add(id)
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch { /* tyliai */ }
  return true
}
