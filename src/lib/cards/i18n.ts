// ── Kortų lokalizacija (Fazė 6) ──────────────────────────────────────────────
// `cards` lentelė = LT šaltinis. Vertimai: `card_translations`, lokalizuoti
// vaizdai: `card_assets` (kortos PNG turi ĮKEPTĄ tekstą, tad EN reikia kito
// paveikslėlio).
//
// SVARBU: variklio efektų parseris (`parseEffect` / `detectKeywords`) dirba su
// LT `effect_text`. Todėl:
//   1) kortą PIRMA suparsink iš LT teksto,
//   2) tik tada per `localizeCard()` perrašyk RODOMUS laukus (name/effect/image).
// Taip logika lieka stabili bet kuria kalba.
//
// Naudojimas (async duomenų sluoksnyje):
//   await ensureCardTranslations()
//   const row = localizeCardRow(dbRow)
// React komponente (jau turimiems objektams):
//   const cx = useCardI18n(); cx.name(card.id, card.name)

import { createClient } from '@/lib/supabase/client'
import { getLocale, subscribe as subscribeLocale } from '@/lib/i18n/core'
import type { SupportedLocale } from '@/lib/i18n/config'

export type CardField = 'name' | 'description' | 'effect_text' | 'flavor_text'
type Tr = Partial<Record<CardField, string>> & { image?: string }

const cache = new Map<SupportedLocale, Map<string, Tr>>()
const listeners = new Set<() => void>()
let inflight: Promise<void> | null = null
let inflightLocale: SupportedLocale | null = null
const warned = new Set<string>()

function notify() { listeners.forEach((l) => l()) }

/** Užkrauna kortų vertimus + lokalizuotus vaizdus. LT – no-op (šaltinis DB lentelėje). */
export async function ensureCardTranslations(locale: SupportedLocale = getLocale()): Promise<void> {
  if (locale === 'lt' || cache.has(locale)) return
  if (inflight && inflightLocale === locale) return inflight
  inflightLocale = locale
  inflight = (async () => {
    const map = new Map<string, Tr>()
    try {
      const supabase = createClient()
      const [tr, as] = await Promise.all([
        supabase.from('card_translations')
          .select('card_id, name, description, effect_text, flavor_text')
          .eq('locale', locale).eq('status', 'approved'),
        supabase.from('card_assets')
          .select('card_id, url').eq('locale', locale).eq('asset_type', 'image'),
      ])
      if (tr.error) throw tr.error
      for (const r of tr.data ?? []) {
        map.set(r.card_id, {
          name: r.name ?? undefined, description: r.description ?? undefined,
          effect_text: r.effect_text ?? undefined, flavor_text: r.flavor_text ?? undefined,
        })
      }
      if (!as.error) {
        for (const r of as.data ?? []) {
          const cur = map.get(r.card_id) ?? {}
          cur.image = r.url
          map.set(r.card_id, cur)
        }
      }
    } catch (e) {
      console.warn('[i18n] nepavyko užkrauti kortų vertimų:', e)   // neblokuojam – rodom LT
    }
    cache.set(locale, map)
    notify()
  })()
  try { await inflight } finally { inflight = null; inflightLocale = null }
}

function get(cardId: string | null | undefined, locale: SupportedLocale): Tr | undefined {
  if (!cardId) return undefined
  return cache.get(locale)?.get(cardId)
}

function warnMissing(cardId: string, field: string, locale: SupportedLocale) {
  if (process.env.NODE_ENV === 'production') return
  const w = `${cardId}:${field}:${locale}`
  if (warned.has(w)) return
  warned.add(w)
  console.warn(`[i18n] trūksta kortos ${locale} vertimo: ${w} → fallback LT`)
}

/** Kortos teksto laukas dabartine kalba (fallback – LT reikšmė iš DB). */
export function cardText(
  cardId: string | null | undefined, field: CardField,
  fallback: string | null | undefined, locale: SupportedLocale = getLocale(),
): string {
  const fb = fallback ?? ''
  if (locale === 'lt' || !cardId) return fb
  const tr = get(cardId, locale)
  if (!tr) { void ensureCardTranslations(locale); return fb }
  const hit = tr[field]
  if (hit) return hit
  if (fb) warnMissing(cardId, field, locale)
  return fb
}

/** Kortos vaizdas dabartine kalba (EN kortos PNG su angliškais tekstais). */
export function cardImage(
  cardId: string | null | undefined, fallbackUrl: string | null | undefined,
  locale: SupportedLocale = getLocale(),
): string | null {
  if (locale === 'lt' || !cardId) return fallbackUrl ?? null
  const tr = get(cardId, locale)
  if (!tr) { void ensureCardTranslations(locale); return fallbackUrl ?? null }
  return tr.image ?? fallbackUrl ?? null
}

/** DB eilutės (cards) lokalizacija: name/description/effect_text/image_url. */
export function localizeCardRow<T extends {
  id: string; name?: string | null; description?: string | null
  effect_text?: string | null; image_url?: string | null
}>(row: T, locale: SupportedLocale = getLocale()): T {
  if (locale === 'lt') return row
  return {
    ...row,
    name: cardText(row.id, 'name', row.name, locale),
    description: cardText(row.id, 'description', row.description, locale),
    effect_text: cardText(row.id, 'effect_text', row.effect_text, locale),
    image_url: cardImage(row.id, row.image_url, locale),
  }
}

/**
 * TutCard lokalizacija PO parseEffect/detectKeywords (jie remiasi LT tekstu).
 * Perrašo tik RODOMUS laukus – `effect`/`mappings` lieka nepaliesti.
 */
export function localizeTutCard<T extends {
  id: string; name: string; image: string | null; effectText: string
}>(card: T, locale: SupportedLocale = getLocale()): T {
  if (locale === 'lt') return card
  return {
    ...card,
    name: cardText(card.id, 'name', card.name, locale),
    effectText: cardText(card.id, 'effect_text', card.effectText, locale),
    image: cardImage(card.id, card.image, locale),
  }
}

export function subscribeCardI18n(cb: () => void): () => void {
  listeners.add(cb)
  const off = subscribeLocale(() => { void ensureCardTranslations(); cb() })
  return () => { listeners.delete(cb); off() }
}

export function isCardI18nLoaded(locale: SupportedLocale = getLocale()): boolean {
  return locale === 'lt' || cache.has(locale)
}

/** Testams. */
export function __resetCardI18n(): void { cache.clear(); warned.clear() }
