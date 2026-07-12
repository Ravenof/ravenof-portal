'use client'

// ── Ravenof i18n — React integracija ─────────────────────────────────────────
// useT(): t() su rerender pakeitus kalbą. Hydration saugumas: server snapshot
// visada 'lt' (SSR HTML = LT), klientas persijungia iškart po hydration.

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { DEFAULT_LOCALE, type SupportedLocale } from './config'
import { getLocale, loadProfileLocale, setLocale, subscribe, translate, type TParams } from './core'
import { isContentLoaded, loadContentTranslations, subscribeContent, tContent, type ContentOwnerType } from './content'
import { cardImage, cardText, ensureCardTranslations, isCardI18nLoaded, subscribeCardI18n } from '@/lib/cards/i18n'

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
  useEffect(() => { void loadContentTranslations(locale) }, [locale])
  return null
}

/**
 * DB turinio vertimai (Fazė 4): tc(ownerType, id, field, fallbackLT).
 * Užkrauna `content_translations` pagal kalbą ir persirenderina, kai atkeliauja.
 */
export function useContent(): (
  ownerType: ContentOwnerType, ownerId: string | number | null | undefined,
  field: string, fallback: string | null | undefined,
) => string {
  const locale = useLocale()
  useSyncExternalStore(subscribeContent, () => isContentLoaded(locale), () => true)
  useEffect(() => { void loadContentTranslations(locale) }, [locale])
  return useCallback(
    (ownerType, ownerId, field, fallback) => tContent(ownerType, ownerId, field, fallback, locale),
    [locale],
  )
}

/** Kortų vertimai (Fazė 6): cx.name(id, ltName), cx.effect(...), cx.image(...). */
export function useCardI18n() {
  const locale = useLocale()
  useSyncExternalStore(subscribeCardI18n, () => isCardI18nLoaded(locale), () => true)
  useEffect(() => { void ensureCardTranslations(locale) }, [locale])
  return useMemo(() => ({
    locale,
    name: (id: string | null | undefined, fb: string | null | undefined) => cardText(id, 'name', fb, locale),
    description: (id: string | null | undefined, fb: string | null | undefined) => cardText(id, 'description', fb, locale),
    effect: (id: string | null | undefined, fb: string | null | undefined) => cardText(id, 'effect_text', fb, locale),
    flavor: (id: string | null | undefined, fb: string | null | undefined) => cardText(id, 'flavor_text', fb, locale),
    image: (id: string | null | undefined, fb: string | null | undefined) => cardImage(id, fb, locale),
  }), [locale])
}
