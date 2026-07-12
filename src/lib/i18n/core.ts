// ── Ravenof i18n — branduolys (be išorinių priklausomybių) ────────────────────
// Kodėl ne i18next: projektui reikia sinchroninio init (jokio LT „blyksnio"),
// mažo bundle (Capacitor shell) ir nulinės priklausomybės nuo npm registrijos.
// Palaikoma: namespace JSON, {{interpoliacija}}, daugiskaita per Intl.PluralRules
// (raktai key_one/key_few/key_many/key_other), fallback EN→LT→raktas.
//
// Rezoliucijos prioritetas (žr. I18N-AUDIT.md):
//   1) aiškus pasirinkimas šioje sesijoje  2) profiles.preferred_locale
//   3) rvn_locale cookie/localStorage      4) navigator.language (en*)  5) 'lt'

import {
  DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_STORAGE_KEY,
  isSupportedLocale, type SupportedLocale,
} from './config'
import { RESOURCES } from './resources'

export type TParams = Record<string, string | number | boolean | null | undefined>

// ── EN→LT fallback registras (Fazė 10) ──────────────────────────────────────
// Kiekvienas kartas, kai EN raktas neranda vertimo ir krentam į LT, įrašom.
// Matoma: window.__rvnI18nFallbacks (e2e/QA) + console.warn dev režime.
export type FallbackHit = { key: string; from: string; to: string }
const fallbacks = new Map<string, FallbackHit>()
export function recordFallback(key: string, from: string, to: string): void {
  if (fallbacks.has(key)) return
  fallbacks.set(key, { key, from, to })
  if (typeof window !== 'undefined') {
    ;(window as unknown as { __rvnI18nFallbacks?: FallbackHit[] }).__rvnI18nFallbacks = [...fallbacks.values()]
  }
  if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] fallback ${from}→${to}: ${key}`)
}
export function i18nFallbacks(): FallbackHit[] { return [...fallbacks.values()] }
export function __resetFallbacks(): void { fallbacks.clear() }

let _locale: SupportedLocale | null = null
let _explicitThisSession = false
const listeners = new Set<() => void>()

// ── Skaitymas iš persistencijos (sinchroniškai, prieš pirmą render) ──────────
function readPersisted(): SupportedLocale | null {
  if (typeof window === 'undefined') return null
  try {
    const ls = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isSupportedLocale(ls)) return ls
  } catch { /* ignore */ }
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`))
    if (m && isSupportedLocale(m[1])) return m[1]
  } catch { /* ignore */ }
  return null
}

function browserDefault(): SupportedLocale {
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const l of langs || []) {
      const base = (l || '').toLowerCase().split('-')[0]
      if (isSupportedLocale(base)) return base
    }
  }
  return DEFAULT_LOCALE
}

export function getLocale(): SupportedLocale {
  if (_locale === null) _locale = readPersisted() ?? browserDefault()
  return _locale
}

function persist(locale: SupportedLocale): void {
  try { window.localStorage.setItem(LOCALE_STORAGE_KEY, locale) } catch { /* ignore */ }
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
  } catch { /* ignore */ }
}

async function persistToProfile(locale: SupportedLocale): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ preferred_locale: locale }).eq('id', user.id)
  } catch { /* tyliai — cookie/LS lieka šaltiniu */ }
}

/** Keičia kalbą (aiškus vartotojo pasirinkimas). UI atsinaujina be reload. */
export function setLocale(locale: SupportedLocale, opts?: { explicit?: boolean; syncProfile?: boolean }): void {
  const explicit = opts?.explicit !== false
  if (explicit) _explicitThisSession = true
  if (locale === getLocale()) { if (explicit) persist(locale); return }
  _locale = locale
  persist(locale)
  if (typeof document !== 'undefined') document.documentElement.lang = locale
  if (opts?.syncProfile !== false && explicit) void persistToProfile(locale)
  listeners.forEach((fn) => { try { fn() } catch { /* ignore */ } })
}

/** Po prisijungimo: taiko profilio kalbą, jei šioje sesijoje nebuvo aiškaus pasirinkimo. */
export function applyProfileLocale(profileLocale: unknown): void {
  if (!isSupportedLocale(profileLocale)) return
  if (_explicitThisSession) return
  if (readPersisted() !== null && readPersisted() === getLocale() && profileLocale === getLocale()) return
  setLocale(profileLocale, { explicit: false, syncProfile: false })
}

/** Užkrauna profilio kalbą iš DB (kviečiama layout'e po auth). */
export async function loadProfileLocale(): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('preferred_locale').eq('id', user.id).maybeSingle()
    applyProfileLocale((data as { preferred_locale?: string } | null)?.preferred_locale)
  } catch { /* tyliai */ }
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ── Vertimų paieška ───────────────────────────────────────────────────────────
type Dict = { [k: string]: string | Dict }

function lookup(locale: SupportedLocale, key: string): string | undefined {
  const dot = key.indexOf('.')
  if (dot < 0) return undefined
  const ns = key.slice(0, dot)
  const rest = key.slice(dot + 1)
  let node: string | Dict | undefined = (RESOURCES[locale] as Record<string, Dict | undefined>)[ns]
  for (const part of rest.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

const _plural: Partial<Record<SupportedLocale, Intl.PluralRules>> = {}
function pluralCategory(locale: SupportedLocale, n: number): string {
  const pr = (_plural[locale] ??= new Intl.PluralRules(locale === 'lt' ? 'lt' : 'en'))
  return pr.select(n)
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const v = params[name]
    return v === null || v === undefined ? '' : String(v)
  })
}

const warned = new Set<string>()

/** Verčia raktą `ns.kelias.raktas` dabartine kalba. `count` parenka daugiskaitą. */
export function translate(locale: SupportedLocale, key: string, params?: TParams): string {
  let k = key
  if (params && typeof params.count === 'number') {
    const cat = pluralCategory(locale, params.count)
    if (lookup(locale, `${key}_${cat}`) !== undefined) k = `${key}_${cat}`
    else if (lookup(locale, `${key}_other`) !== undefined) k = `${key}_other`
  }
  let raw = lookup(locale, k)
  if (raw === undefined && locale !== DEFAULT_LOCALE) {
    raw = lookup(DEFAULT_LOCALE, k)
    if (raw !== undefined) recordFallback(k, locale, DEFAULT_LOCALE)   // EN→LT: fiksuojam
  }
  if (raw === undefined) {
    if (process.env.NODE_ENV !== 'production' && !warned.has(k)) {
      warned.add(k)
      console.warn(`[i18n] Trūksta vertimo rakto: "${k}" (${locale})`)
    }
    return key
  }
  return interpolate(raw, params)
}

/** Patogus t() su dabartine globalia kalba (ne React kontekstams: lib/, engine). */
export function t(key: string, params?: TParams): string {
  return translate(getLocale(), key, params)
}

// ── Intl pagalbininkai (naudoti vietoj hardcoded LT formatų) ─────────────────
export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getLocale(), opts).format(n)
}
export function formatDate(d: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getLocale(), opts).format(typeof d === 'string' || typeof d === 'number' ? new Date(d) : d)
}
export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  return new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' }).format(value, unit)
}
export function formatList(items: string[]): string {
  return new Intl.ListFormat(getLocale(), { style: 'long', type: 'conjunction' }).format(items)
}
