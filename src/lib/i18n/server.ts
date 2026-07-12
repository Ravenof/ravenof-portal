// ── i18n serverio pusėje (Server Components) ────────────────────────────────
// Klientinis `useT()` čia neveikia. Serveryje kalbą imam iš `rvn_locale` cookie
// (tą patį rašo lib/i18n/core.ts). Puslapiai, kurie jau yra dynamic (naudoja
// supabase/cookies), gali tai naudoti be papildomos kainos.

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, isSupportedLocale, DEFAULT_LOCALE, type SupportedLocale } from './config'
import { translate, type TParams } from './core'

export async function getServerLocale(): Promise<SupportedLocale> {
  try {
    const c = await cookies()
    const v = c.get(LOCALE_COOKIE)?.value
    return isSupportedLocale(v) ? v : DEFAULT_LOCALE
  } catch { return DEFAULT_LOCALE }
}

/** Serverio t(): `const t = await getServerT()`. */
export async function getServerT(): Promise<(key: string, params?: TParams) => string> {
  const locale = await getServerLocale()
  return (key: string, params?: TParams) => translate(locale, key, params)
}
