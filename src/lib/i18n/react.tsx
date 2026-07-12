'use client'

// ── Ravenof i18n — React integracija ─────────────────────────────────────────
// useT(): t() su rerender pakeitus kalbą. Hydration saugumas: server snapshot
// visada 'lt' (SSR HTML = LT), klientas persijungia iškart po hydration.

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { DEFAULT_LOCALE, type SupportedLocale } from './config'
import { getLocale, loadProfileLocale, setLocale, subscribe, translate, type TParams } from './core'

export function useLocale(): SupportedLocale {
  return useSyncExternalStore(subscribe, getLocale, () => DEFAULT_LOCALE)
}

/** Vertimo hook'as: const t = useT(); t('battle.endTurn') */
export function useT(): (key: string, params?: TParams) => string {
  const locale = useLocale()
  return useCallback((key: string, params?: TParams) => translate(locale, key, params), [locale])
}

export { setLocale }

/** Montuojamas layout'e: <html lang>, profilio kalbos užkrovimas po auth. */
export function I18nBoot(): null {
  const locale = useLocale()
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  useEffect(() => { void loadProfileLocale() }, [])
  return null
}
