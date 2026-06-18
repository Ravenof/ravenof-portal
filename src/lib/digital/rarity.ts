// ── Kanoninės retumo spalvos ir lygiai (naudojama visoje digital aplinkoje) ────
// Paprastas=pilkas, Magiškas=žalias, Unikalus=mėlynas, Epiškas=violetinis, Legendinis=raudonas.
// Spalvos nustatomos pagal pavadinimą (LT/EN), nepriklausomai nuo DB color_hex.

export function rarityColor(name?: string | null): string {
  const s = (name || '').toLowerCase()
  if (/legend/.test(s)) return '#ef4444'    // legendinis — raudonas
  if (/epi[sšc]/.test(s)) return '#a855f7'  // epiškas — violetinis
  if (/unik|uniq/.test(s)) return '#3b82f6' // unikalus — mėlynas
  if (/magi/.test(s)) return '#22c55e'      // magiškas — žalias
  return '#9ca3af'                          // paprastas — pilkas
}

/** Retumo lygis efektams: 0 paprastas, 1 magiškas, 2 unikalus, 3 epiškas, 4 legendinis. */
export function rarityLevel(name?: string | null): number {
  const s = (name || '').toLowerCase()
  if (/legend/.test(s)) return 4
  if (/epi[sšc]/.test(s)) return 3
  if (/unik|uniq/.test(s)) return 2
  if (/magi/.test(s)) return 1
  return 0
}
