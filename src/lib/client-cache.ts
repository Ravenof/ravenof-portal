/**
 * Lightweight localStorage cache with TTL.
 * Used to avoid redundant API/SSR fetches for static reference data
 * (factions, card types, rarities) that rarely change.
 *
 * Falls back gracefully if localStorage is unavailable (SSR, private mode).
 */

const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1 hour

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

function isAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem('__rvn_test', '1')
    window.localStorage.removeItem('__rvn_test')
    return true
  } catch {
    return false
  }
}

export function cacheGet<T>(key: string): T | null {
  if (!isAvailable()) return null
  try {
    const raw = localStorage.getItem('rvn_' + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem('rvn_' + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  if (!isAvailable()) return
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs }
    localStorage.setItem('rvn_' + key, JSON.stringify(entry))
  } catch {
    // storage full or other error — silently ignore
  }
}

export function cacheClear(key: string): void {
  if (!isAvailable()) return
  try { localStorage.removeItem('rvn_' + key) } catch { /* ignore */ }
}
