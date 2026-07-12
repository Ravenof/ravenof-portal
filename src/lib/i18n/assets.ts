// ── Lokalizuoti asset'ai (PNG su ĮKEPTU tekstu) ──────────────────────────────
// DOM skenavimas neranda teksto, įkepto į paveikslėlį. Todėl visi asset'ai su
// tekstu registruojami ČIA:
//
//   lt   – dabartinis LT paveikslėlis
//   en   – EN variantas (null = dar nėra)
//   text – ar paveikslėlyje ĮKEPTAS tekstas (jei taip ir EN varianto nėra,
//          EN režime jis NERODOMAS – vietoje jo renderinamas HTML tekstas)
//
// Ilgalaikė kryptis: paveikslėliai BE teksto + HTML/CSS antraštės. Registras
// leidžia pereiti palaipsniui ir automatiškai patikrinti pilnumą
// (`npm run i18n:validate` → „MISSING ASSET").

import type { SupportedLocale } from './config'

export type LocalizedAsset = {
  /** LT (arba neutralus) paveikslėlis. */
  lt: string
  /** EN variantas; null – dar nesukurtas. */
  en: string | null
  /** Ar paveikslėlyje įkeptas tekstas (tada EN be savo asset'o jo NErodo). */
  bakedText: boolean
  /** i18n raktas HTML tekstui, kai asset'as nerodomas. */
  labelKey?: string
}

export const LOCALIZED_ASSETS = {
  homeHeading:      { lt: '/digital/ui3/heading.png', en: null, bakedText: true, labelKey: 'home.playNow' },
  homeCta:          { lt: '/digital/ui3/cta2.png',    en: null, bakedText: true, labelKey: 'home.startBattle' },
  modeRanked:       { lt: '/digital/home/battle-modes/ranked.png?v=2',     en: null, bakedText: true, labelKey: 'home.modes.ranked' },
  modeAgainstAi:    { lt: '/digital/home/battle-modes/against-ai.png?v=2', en: null, bakedText: true, labelKey: 'home.modes.pve' },
  modeFriendly:     { lt: '/digital/home/battle-modes/friendly.png?v=2',   en: null, bakedText: true, labelKey: 'home.modes.free' },
} as const satisfies Record<string, LocalizedAsset>

export type LocalizedAssetKey = keyof typeof LOCALIZED_ASSETS

/** Neutralus (be teksto) CTA rėmelis – naudojamas su HTML tekstu. */
export const NEUTRAL_CTA = '/digital/ui3/cta-blank.png'

/**
 * Grąžina asset'ą kalbai arba `null`, jei kalbai jo nėra IR jame įkeptas kitos
 * kalbos tekstas. `null` = UI privalo rodyti HTML tekstą (labelKey).
 */
export function localizedAsset(key: LocalizedAssetKey, locale: SupportedLocale): string | null {
  const a = LOCALIZED_ASSETS[key] as LocalizedAsset
  if (locale === 'lt') return a.lt
  if (a.en) return a.en
  return a.bakedText ? null : a.lt
}

/** Ataskaitai: kurių kalbų asset'ų trūksta. */
export function missingLocalizedAssets(locale: SupportedLocale): LocalizedAssetKey[] {
  if (locale === 'lt') return []
  return (Object.keys(LOCALIZED_ASSETS) as LocalizedAssetKey[])
    .filter((k) => (LOCALIZED_ASSETS[k] as LocalizedAsset).bakedText && !(LOCALIZED_ASSETS[k] as LocalizedAsset).en)
}
