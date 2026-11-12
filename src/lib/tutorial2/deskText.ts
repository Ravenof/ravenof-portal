// Mokymų tekstai parašyti telefonui („pirštu", „bakstelėk"). Kompiuteryje (pelė) rodomą
// tekstą pakeičiam pelės variantu – pamokų turinio (DB) ir Korvo balso nekeičiant.
const RULES: [RegExp, string][] = [
  [/Ne spausk — PALAIKYK pirštą \(ar pelės mygtuką\) ant kortos\./g, 'Spustelėk kortą DEŠINIU pelės klavišu (arba palaikyk kairįjį).'],
  [/Palaikyk pirštą ant kortos/g, 'Spustelėk kortą dešiniu pelės klavišu'],
  [/Palaikyk ant jos pirštą/g, 'Spustelėk ją dešiniu pelės klavišu'],
  [/Atleisi pirštą — dings\./g, 'Spustelėsi šalia — dings.'],
  [/Paimk kortą pirštu/g, 'Paimk kortą pele'],
  [/Paimk ją pirštu/g, 'Paimk ją pele'],
  [/paimk savo padarą pirštu/g, 'paimk savo padarą pele'],
  [/Bakstelėk/g, 'Spustelėk'],
  [/bakstelėk/g, 'spustelėk'],
]

export function isPointerFine(): boolean {
  try { return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches } catch { return false }
}

export function deskText<T extends string | null | undefined>(s: T, desktop: boolean): T {
  if (!desktop || !s) return s
  let out: string = s
  for (const [re, to] of RULES) out = out.replace(re, to)
  return out as T
}
