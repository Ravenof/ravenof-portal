import { createBrowserClient } from '@supabase/ssr'
import { createOfflineFetch } from '@/lib/offline/offlineFetch'

/** Local-first app bundle (apps/digital): visos užklausos per offline-first transportą. Web'e – kaip iki šiol. */
function isAppBundle(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __RAVENOF_APP_BUNDLE__?: boolean }).__RAVENOF_APP_BUNDLE__ === true
}

let offlineFetch: typeof fetch | null = null

// ── Sesijos saugykla app bundle'ui ───────────────────────────────────────────
// @supabase/ssr sesiją laiko cookie'uose. Electron `app://` (ir bet kuris ne-http
// origin'as) cookie'ų nepalaiko – prisijungimas „pavyksta“, bet sesija dingsta ir
// vartotojas grąžinamas į login. Bundle'e cookie API emuliuojamas per localStorage.
const LS_KEY = 'rvn.auth.cookies'
type CookieRec = { name: string; value: string; options?: { maxAge?: number; expires?: Date } }
function localStorageCookies() {
  const read = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
  return {
    getAll: (): { name: string; value: string }[] => Object.entries(read()).map(([name, value]) => ({ name, value })),
    setAll: (list: CookieRec[]) => {
      const m = read()
      for (const c of list) {
        const expired = (c.options?.maxAge !== undefined && c.options.maxAge <= 0) || (c.options?.expires instanceof Date && c.options.expires.getTime() <= Date.now())
        if (!c.value || expired) delete m[c.name]
        else m[c.name] = c.value
      }
      try { localStorage.setItem(LS_KEY, JSON.stringify(m)) } catch { /* privatus režimas / kvota */ }
    },
  }
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  if (isAppBundle()) {
    offlineFetch ??= createOfflineFetch(window.fetch.bind(window))
    return createBrowserClient(url, key, { global: { fetch: offlineFetch }, cookies: localStorageCookies() })
  }
  return createBrowserClient(url, key)
}
