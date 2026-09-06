// ── Server-authoritative PvP transportas ─────────────────────────────────────
// Drop-in Supabase Realtime kanalo pakaitalas (tas pats API poaibis, kurį naudoja
// TutorialGame: on('broadcast'), on('presence'), presenceState(), subscribe(),
// track(), send()). Vietoj peer-to-peer broadcast'o – WebSocket į apps/server,
// kuris laiko autoritetingą GameState ir vykdo applyNetAction.
//
// Protokolas (JSON): kliento → serverio: { t:'join', matchId, side, token } |
//   { t:'event', event, payload }  (event = 'action'|'deck'|'hello'|'skin'|'chat'|'emote')
// serverio → kliento: { t:'event', event, payload } | { t:'presence', sides:[…] } | { t:'error', code }
//
// Perspektyva: serveris seat 'you' žaidėjui siunčia swapPerspective(state), o seat
// 'ai' – originalą; klientas (svečio logika) visada daro swapPerspective → abu
// mato save kaip 'you'. Veiksmus klientas siunčia swapAction'inęs (svečio logika);
// serveris seat 'you' veiksmus dar kartą swap'ina atgal.
import { createClient } from '@/lib/supabase/client'

export function pvpServerUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_PVP_SERVER_URL
  return u && u.length > 0 ? u : null
}

type BroadcastCb = (msg: { payload: unknown }) => void
type Status = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT'

export type ServerChannel = {
  on(type: 'broadcast', filter: { event: string }, cb: BroadcastCb): ServerChannel
  on(type: 'presence', filter: { event: 'sync' }, cb: () => void): ServerChannel
  presenceState(): Record<string, { side?: string }[]>
  subscribe(cb: (status: Status) => void): ServerChannel
  track(meta: { side?: string }): Promise<void>
  send(msg: { type: 'broadcast'; event: string; payload: unknown }): Promise<'ok' | 'error'>
  unsubscribe(): Promise<void>
  readonly __rvnServer: true
}

export function isServerChannel(ch: unknown): ch is ServerChannel {
  return !!ch && typeof ch === 'object' && (ch as { __rvnServer?: boolean }).__rvnServer === true
}

export function createServerChannel(opts: { url: string; matchId: string; side: 'you' | 'ai' }): ServerChannel {
  const handlers = new Map<string, BroadcastCb[]>()
  let presenceCb: (() => void) | null = null
  let presence: Record<string, { side?: string }[]> = {}
  let ws: WebSocket | null = null
  let closed = false
  let statusCb: ((s: Status) => void) | null = null
  const outbox: string[] = []
  let attempt = 0

  const wsUrl = opts.url.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'

  async function connect() {
    if (closed) return
    const { data } = await createClient().auth.getSession()
    const token = data.session?.access_token
    if (!token) { statusCb?.('CHANNEL_ERROR'); return }
    const sock = new WebSocket(wsUrl)
    ws = sock
    sock.onopen = () => {
      attempt = 0
      sock.send(JSON.stringify({ t: 'join', matchId: opts.matchId, side: opts.side, token }))
    }
    sock.onmessage = (ev) => {
      let m: { t: string; event?: string; payload?: unknown; sides?: string[]; code?: string }
      try { m = JSON.parse(String(ev.data)) } catch { return }
      if (m.t === 'joined') {
        statusCb?.('SUBSCRIBED')
        while (outbox.length) sock.send(outbox.shift()!)
      } else if (m.t === 'event' && m.event) {
        for (const cb of handlers.get(m.event) ?? []) cb({ payload: m.payload })
      } else if (m.t === 'presence') {
        presence = Object.fromEntries((m.sides ?? []).map((s) => [s, [{ side: s }]]))
        presenceCb?.()
      } else if (m.t === 'error') {
        console.warn('[pvp-server]', m.code)
        if (m.code === 'unauthorized' || m.code === 'room_full') { closed = true; statusCb?.('CHANNEL_ERROR') }
      }
    }
    sock.onclose = () => {
      if (closed) return
      presence = {}; presenceCb?.()
      const delay = Math.min(15000, 1000 * 2 ** attempt++)
      window.setTimeout(() => { void connect() }, delay)
    }
    sock.onerror = () => { /* onclose seka */ }
  }

  const ch: ServerChannel = {
    __rvnServer: true,
    on(type: 'broadcast' | 'presence', filter: { event: string }, cb: BroadcastCb | (() => void)) {
      if (type === 'presence') presenceCb = cb as () => void
      else handlers.set(filter.event, [...(handlers.get(filter.event) ?? []), cb as BroadcastCb])
      return ch
    },
    presenceState: () => presence,
    subscribe(cb) { statusCb = cb; void connect(); return ch },
    async track() { /* presence tvarko serveris pagal join */ },
    async send(msg) {
      const raw = JSON.stringify({ t: 'event', event: msg.event, payload: msg.payload })
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(raw); else outbox.push(raw)
      return 'ok'
    },
    async unsubscribe() { closed = true; try { ws?.close() } catch { /* */ } },
  }
  return ch
}
