// ── Sync eilės paleidėjas (app bundle) ───────────────────────────────────────
// Kviečiamas iš apps/digital runtime: starte, 'online' įvykyje ir kas 60 s.
import { createClient } from '@/lib/supabase/client'
import { flushQueue } from './offlineFetch'

export function startOfflineSync(): () => void {
  const getToken = async () => (await createClient().auth.getSession()).data.session?.access_token ?? null
  const run = () => { if (typeof navigator === 'undefined' || navigator.onLine !== false) void flushQueue(getToken, window.fetch.bind(window)) }
  run()
  window.addEventListener('online', run)
  const iv = window.setInterval(run, 60_000)
  return () => { window.removeEventListener('online', run); window.clearInterval(iv) }
}
