import { createClient } from '@supabase/supabase-js'

/**
 * Singleton public (anon) Supabase client.
 * Nesinaudoja cookies — naudoti tik viešiems, read-only DB queries.
 * Šis klientas leidžia Next.js ISR caching (nėra `cookies()` iškvietimo).
 */
const _client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
)

export function createPublicClient() {
  return _client
}
