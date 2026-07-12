// ── Ravenof i18n — DB TURINIO vertimai (Fazė 4) ──────────────────────────────
// UI raktai gyvena src/locales/*.json, o DB turinys (užduotys, parduotuvė,
// kosmetika, pasiekimai, frakcijos, retumai, kortų tipai) — lentelėje
// `content_translations` (owner_type, owner_id, locale, field, value).
//
// Principas: LT reikšmė lieka pačioje lentelėje (fallback), tad jei vertimo
// nėra – rodomas originalus LT tekstas (dev režime + įspėjimas konsolėje).
//
// Naudojimas React komponente:
//   const tc = useContent()
//   tc('shop_item', it.slug, 'name', it.name)

import { createClient } from '@/lib/supabase/client'
import { getLocale, subscribe as subscribeLocale } from './core'
import type { SupportedLocale } from './config'

export type ContentOwnerType =
  | 'daily_quest' | 'daily_task' | 'shop_item' | 'cosmetic' | 'ranked_achievement'
  | 'faction' | 'rarity' | 'card_type' | 'card_pack' | 'starter_deck' | 'lore_faction'

type Store = Record<string, string>          // "owner_type:owner_id:field" -> value
const cache = new Map<SupportedLocale, Store>()
const listeners = new Set<() => void>()
let loading: SupportedLocale | null = null
const warned = new Set<string>()

const CACHE_KEY = 'rvn_content_i18n_v1'

function notify() { listeners.forEach((l) => l()) }
function k(owner: string, id: string, field: string) { return `${owner}:${id}:${field}` }

function readSession(locale: SupportedLocale): Store | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(`${CACHE_KEY}:${locale}`)
    return raw ? (JSON.parse(raw) as Store) : null
  } catch { return null }
}
function writeSession(locale: SupportedLocale, store: Store) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(`${CACHE_KEY}:${locale}`, JSON.stringify(store)) } catch { /* ignore */ }
}

/** Užkrauna visus vertimus kalbai (LT – no-op: LT jau yra pačiose lentelėse). */
export async function loadContentTranslations(locale: SupportedLocale = getLocale()): Promise<void> {
  if (locale === 'lt' || cache.has(locale) || loading === locale) return
  const cached = readSession(locale)
  if (cached) { cache.set(locale, cached); notify(); return }
  loading = locale
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('content_translations')
      .select('owner_type, owner_id, field, value')
      .eq('locale', locale)
    if (error) throw error
    const store: Store = {}
    for (const r of data ?? []) store[k(r.owner_type, r.owner_id, r.field)] = r.value
    cache.set(locale, store)
    writeSession(locale, store)
    notify()
  } catch (e) {
    console.warn('[i18n] nepavyko užkrauti turinio vertimų:', e)
    cache.set(locale, {})   // neblokuojam UI – rodom LT fallback
    notify()
  } finally {
    loading = null
  }
}

/** Sinchroninis getteris (ne-React kodui). Grąžina fallback, jei vertimo nėra. */
export function tContent(
  ownerType: ContentOwnerType, ownerId: string | number | null | undefined,
  field: string, fallback: string | null | undefined, locale: SupportedLocale = getLocale(),
): string {
  const fb = fallback ?? ''
  if (locale === 'lt' || ownerId == null) return fb
  const store = cache.get(locale)
  if (!store) { void loadContentTranslations(locale); return fb }
  const hit = store[k(ownerType, String(ownerId), field)]
  if (hit) return hit
  if (process.env.NODE_ENV !== 'production' && fb) {
    const w = k(ownerType, String(ownerId), field) + ':' + locale
    if (!warned.has(w)) { warned.add(w); console.warn(`[i18n] trūksta ${locale} vertimo: ${w} → fallback LT „${fb}"`) }
  }
  return fb
}

export function subscribeContent(cb: () => void): () => void {
  listeners.add(cb)
  const off = subscribeLocale(() => { void loadContentTranslations(); cb() })
  return () => { listeners.delete(cb); off() }
}

/** Ar vertimai kalbai jau užkrauti (testams / SSR guard'ams). */
export function isContentLoaded(locale: SupportedLocale = getLocale()): boolean {
  return locale === 'lt' || cache.has(locale)
}

/** Testams. */
export function __resetContentCache(): void { cache.clear(); warned.clear() }
