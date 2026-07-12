// ── Ravenof i18n — konfigūracija ──────────────────────────────────────────────
// Kanoniniai locale kodai. LT = šaltinio kalba, EN = pilna antrinė kalba.

export type SupportedLocale = 'lt' | 'en'

export const SUPPORTED_LOCALES: SupportedLocale[] = ['lt', 'en']
export const DEFAULT_LOCALE: SupportedLocale = 'lt'

export const LANGUAGE_OPTIONS: { locale: SupportedLocale; nativeName: string; shortName: string }[] = [
  { locale: 'lt', nativeName: 'Lietuvių', shortName: 'LT' },
  { locale: 'en', nativeName: 'English',  shortName: 'EN' },
]

export const LOCALE_COOKIE = 'rvn_locale'
export const LOCALE_STORAGE_KEY = 'rvn_locale'

export function isSupportedLocale(v: unknown): v is SupportedLocale {
  return v === 'lt' || v === 'en'
}
