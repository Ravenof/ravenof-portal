// ── Offline-first Supabase transportas (app bundle) ──────────────────────────
// Vienas taškas, per kurį eina VISOS supabase-js užklausos (global.fetch).
// Nekeičiant 100+ vietų, kur komponentai kviečia supabase.from()/rpc():
//
//   • GET /rest/v1/*, /auth/v1/user, POST /rest/v1/rpc/<read-only rpc>:
//       tinklas → atsakymas kešuojamas IndexedDB (raktas: user + URL [+ body]);
//       tinklo klaida → grąžinamas KEŠUOTAS atsakymas su antrašte x-rvn-offline: 1.
//   • Rašymai leidžiamų lentelių (decks, deck_cards, profiles) ir RPC (aktyvi kaladė,
//     avataras, nustatymai): tinklo klaida → įrašoma į sync eilę, grąžinamas 204;
//     eilė paleidžiama 'online' įvykyje ir app starte (flushQueue).
//   • Visa kita (pakų atidarymas, ranked, rewards…) offline – tikra klaida, kaip iki šiol.
//
// Konfliktų taisyklė: kolekcijai/ekonomikai serveris visada teisus (jos ir
// nekešuojam rašymui); kaladėms/nustatymams – paskutinis kliento rašymas laimi.

import { kv } from './kv'

const CACHEABLE_GET = [/\/rest\/v1\/(?!rpc\/)/, /\/auth\/v1\/user$/]
const READ_RPC = /\/rest\/v1\/rpc\/(rvn_get_|rvn_list_|rvn_media_manifest|rvn_wallet|rvn_balances|rvn_daily_|rvn_season_|rvn_quest_status|rvn_login_)/
const QUEUE_TABLES = /\/rest\/v1\/(decks|deck_cards|profiles)(\?|$)/
const QUEUE_RPC = /\/rest\/v1\/rpc\/(rvn_set_active_deck|rvn_set_deck_avatar|rvn_save_digital_settings)$/
const MAX_CACHE_AGE_MS = 30 * 24 * 3600 * 1000

type Cached = { status: number; headers: Record<string, string>; body: string; at: number }
type Queued = { id: string; at: number; method: string; url: string; headers: Record<string, string>; body: string | null }

let flushing = false
let listeners: Array<(n: number) => void> = []
export function onQueueChange(fn: (n: number) => void): () => void { listeners.push(fn); return () => { listeners = listeners.filter((f) => f !== fn) } }
async function notify() { const n = (await kv.all<Queued>('queue')).length; for (const f of listeners) f(n) }

function userKeyFromAuth(headers: Headers): string {
  const auth = headers.get('authorization') ?? ''
  const tok = auth.replace(/^Bearer\s+/i, '')
  try {
    const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return String(payload.sub ?? 'anon')
  } catch { return 'anon' }
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)
}

function pickHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  h.forEach((v, k) => { if (['content-type', 'content-range', 'x-rvn-offline'].includes(k)) out[k] = v })
  return out
}

export function createOfflineFetch(base: typeof fetch = fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init)
    const url = req.url
    const method = req.method.toUpperCase()
    const isRead = (method === 'GET' && CACHEABLE_GET.some((r) => r.test(url))) || (method === 'POST' && READ_RPC.test(url))
    const isQueueable = (method !== 'GET' && QUEUE_TABLES.test(url)) || (method === 'POST' && QUEUE_RPC.test(url))
    const bodyText = isRead || isQueueable ? (method === 'GET' ? null : await req.clone().text()) : null
    const cacheKey = isRead ? `${userKeyFromAuth(req.headers)}|${method}|${url}|${bodyText ?? ''}` : null

    try {
      const res = await base(req)
      if (isRead && res.ok && cacheKey) {
        const body = await res.clone().text()
        void kv.set('responses', cacheKey, { status: res.status, headers: pickHeaders(res.headers), body, at: Date.now() } satisfies Cached)
      }
      return res
    } catch (e) {
      if (!isNetworkError(e)) throw e
      if (isRead && cacheKey) {
        const c = await kv.get<Cached>('responses', cacheKey)
        if (c && Date.now() - c.at < MAX_CACHE_AGE_MS) {
          return new Response(c.body, { status: c.status, headers: { ...c.headers, 'x-rvn-offline': '1' } })
        }
      }
      if (isQueueable) {
        const headers: Record<string, string> = {}
        req.headers.forEach((v, k) => { if (k !== 'authorization') headers[k] = v })
        const q: Queued = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now(), method, url, headers, body: bodyText }
        await kv.put('queue', q)
        void notify()
        // Optimistinis atsakymas: supabase-js .select() po insert'o gaus tuščią masyvą – komponentai tai toleruoja.
        return new Response(method === 'POST' && !QUEUE_RPC.test(url) ? '[]' : null, { status: method === 'POST' && !QUEUE_RPC.test(url) ? 201 : 204, headers: { 'content-type': 'application/json', 'x-rvn-offline': '1' } })
      }
      throw e
    }
  }) as typeof fetch
}

/** Paleidžia sync eilę: eilės tvarka, su dabartiniu access token'u. 4xx – išmetama (log), tinklo klaida – stabdom. */
export async function flushQueue(getToken: () => Promise<string | null>, base: typeof fetch = fetch): Promise<{ sent: number; dropped: number }> {
  if (flushing) return { sent: 0, dropped: 0 }
  flushing = true
  let sent = 0, dropped = 0
  try {
    const items = (await kv.all<Queued>('queue')).sort((a, b) => a.at - b.at)
    if (items.length === 0) return { sent, dropped }
    const token = await getToken()
    for (const q of items) {
      const headers = { ...q.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }
      try {
        const res = await base(q.url, { method: q.method, headers, body: q.body })
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          if (!res.ok) { dropped++; console.warn('[offline] eilės įrašas atmestas', res.status, q.url) } else sent++
          await kv.del('queue', q.id)
        } else break
      } catch (e) { if (isNetworkError(e)) break; dropped++; await kv.del('queue', q.id) }
    }
  } finally { flushing = false; void notify() }
  return { sent, dropped }
}

export async function queueLength(): Promise<number> { return (await kv.all<Queued>('queue')).length }
