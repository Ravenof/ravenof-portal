// ── Kaladžių pasirinkimo atmintis + kaladė↔avataras poravimas ────────────────
// localStorage (per įrenginį): paskutinė naudota kaladė kiekvienam kovos režimui
// ir žaidėjo priskirtas avataras konkrečiai kaladei. Pasirinkus kaladę su
// poravimu, avataras automatiškai užsidedamas (rvn_equip_cosmetic per cosmetics.ts).

export type BattleMode = 'pve' | 'pvp' | 'ranked'

const K_LAST = 'rvn-last-deck-'      // + mode
const K_PAIR = 'rvn-deck-avatar'     // JSON: { [deckId]: avatarId }

export function getLastDeck(mode: BattleMode): string | null {
  try { return window.localStorage.getItem(K_LAST + mode) } catch { return null }
}
export function setLastDeck(mode: BattleMode, deckId: string): void {
  try { window.localStorage.setItem(K_LAST + mode, deckId) } catch { /* */ }
}

function readPairs(): Record<string, string> {
  try {
    const r = window.localStorage.getItem(K_PAIR)
    const o = r ? JSON.parse(r) : null
    return o && typeof o === 'object' ? o as Record<string, string> : {}
  } catch { return {} }
}
export function getDeckAvatar(deckId: string): string | null {
  return readPairs()[deckId] ?? null
}
export function setDeckAvatar(deckId: string, avatarId: string | null): void {
  try {
    const m = readPairs()
    if (avatarId) m[deckId] = avatarId; else delete m[deckId]
    window.localStorage.setItem(K_PAIR, JSON.stringify(m))
  } catch { /* */ }
}
