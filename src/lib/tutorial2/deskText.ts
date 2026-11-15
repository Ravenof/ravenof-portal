import { TUTORIAL_EN } from '@/data/tutorialLessons/lessonsEn'

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

// ── EN: pamokos tekstas pagal kalbą (LT → EN žodynas) + pelės variantas ──────
const RULES_EN: [RegExp, string][] = [
  [/Don't tap — HOLD your finger \(or the mouse button\) on the card\./g, 'RIGHT-click the card (or hold the left button).'],
  [/Hold your finger on the card/g, 'Right-click the card'],
  [/Hold your finger on a card/g, 'Right-click a card'],
  [/Pick up the card with your finger/g, 'Pick up the card with the mouse'],
  [/\bTap\b/g, 'Click'],
  [/\btap\b/g, 'click'],
]

/** Pamokos tekstas rodymui: EN režime – vertimas iš TUTORIAL_EN (jei yra), kitaip LT; kompiuteryje – pelės variantas. */
export function lessonText<T extends string | null | undefined>(s: T, locale: string, desktop: boolean): T {
  if (!s) return s
  if (locale === 'en') {
    const en = TUTORIAL_EN[s.trim()]
    if (en) {
      let out = en
      if (desktop) for (const [re, to] of RULES_EN) out = out.replace(re, to)
      return out as T
    }
  }
  return deskText(s, desktop)
}
