import { createBrowserClient } from '@supabase/ssr'
import { createOfflineFetch } from '@/lib/offline/offlineFetch'

/** Local-first app bundle (apps/digital): visos užklausos per offline-first transportą. Web'e – kaip iki šiol. */
function isAppBundle(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __RAVENOF_APP_BUNDLE__?: boolean }).__RAVENOF_APP_BUNDLE__ === true
}

let offlineFetch: typeof fetch | null = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  if (isAppBundle()) {
    offlineFetch ??= createOfflineFetch(window.fetch.bind(window))
    return createBrowserClient(url, key, { global: { fetch: offlineFetch } })
  }
  return createBrowserClient(url, key)
}
