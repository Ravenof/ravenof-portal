// ── App bundle runtime ───────────────────────────────────────────────────────
// Dalykai, kuriuos Next'e darė serveris / root layout'as, ir local-first specifika.
import { markTransformsBroken } from '@/lib/img'
import { installMediaShim, localMediaCount } from './mediaShim'
import { installFpsOverlay } from './fpsOverlay'
import { startOfflineSync } from '@/lib/offline/sync'
import { warmOfflineCache } from '@/lib/offline/warm'
import { installOfflineBadge } from './offlineBadge'
import { createClient } from '@/lib/supabase/client'

declare global { interface Window { __RAVENOF_APP_BUNDLE__?: boolean } }

export async function installAppBundleRuntime(): Promise<void> {
  window.__RAVENOF_APP_BUNDLE__ = true
  // Vietiniai media failai (dist/media) – žr. mediaShim.ts ir tools/build-media.mjs.
  await installMediaShim()
  // Supabase image transformacijų bundle'e nenaudojam: vietiniai failai jau optimizuoti,
  // o /render/image URL'ai reikštų tinklo užklausą ir egress'ą.
  if (localMediaCount() > 0) markTransformsBroken()
  installFpsOverlay()
  // Offline sync eilė (decks/deck_cards/profiles rašymai be tinklo) – žr. src/lib/offline/offlineFetch.ts
  startOfflineSync()
  installOfflineBadge()
  // Pirmą kartą su tinklu – pašildom offline cache (kortos, kaladės, kolekcija).
  const sb = createClient()
  sb.auth.onAuthStateChange(() => { void warmOfflineCache() })
  window.addEventListener('online', () => { void warmOfflineCache() })
  void warmOfflineCache()
  console.info(`[ravenof] app bundle · local media: ${localMediaCount()} failų`)
}
