// ── Ravenof PvP serveris (server-authoritative) ──────────────────────────────
// Tas pats taisyklių variklis kaip kliente (src/lib/tutorial/engine.ts), bet
// autoritetinga būsena gyvena čia. Klientai – „svečiai" (žr. src/lib/pvp/serverChannel.ts).
//
// ENV: PORT (8080), SUPABASE_URL, SUPABASE_ANON_KEY (zmk_cards), SUPABASE_JWT_SECRET
//      (HS256 – Supabase Dashboard → Settings → API → JWT Secret). Be JWT_SECRET –
//      DEV režimas: token'as dekoduojamas be parašo tikrinimo (tik lokaliai!).
// Build: npm run server:build → apps/server/dist/index.js ; run: npm run server:start
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { jwtVerify, decodeJwt } from 'jose'
import { seedRng } from '@/lib/game/rng'
import {
  createGame, beginTurn, applyNetAction, swapPerspective, swapAction,
  type GameState, type NetAction, type TutCard, type Side,
} from '@/lib/tutorial/engine'
import type { ZmkCardDef } from '@/lib/game/types'
import { redactForSeat } from './redact'

const PORT = Number(process.env.PORT ?? 8080)
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? ''
const ROOM_TTL_MS = 10 * 60_000
const DISCONNECT_GRACE_MS = 60_000
const RULES_VERSION = 'engine.ts@' + (process.env.GIT_SHA ?? 'dev')

type Seat = 'you' | 'ai'
type Client = { ws: WebSocket; userId: string; seat: Seat }
type Room = {
  id: string
  seats: Partial<Record<Seat, Client>>
  userBySeat: Partial<Record<Seat, string>>
  decks: Partial<Record<Seat, { cards: TutCard[]; curses: TutCard[] }>>
  skins: Partial<Record<Seat, unknown>>
  game: GameState | null
  lastActivity: number
  graceTimer?: NodeJS.Timeout
}

const rooms = new Map<string, Room>()
let zmkDefs: ZmkCardDef[] | null = null

// ── Auth ─────────────────────────────────────────────────────────────────────
async function verifyToken(token: string): Promise<string | null> {
  try {
    if (JWT_SECRET) {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), { algorithms: ['HS256'] })
      return typeof payload.sub === 'string' ? payload.sub : null
    }
    const p = decodeJwt(token)
    if (p.exp && p.exp * 1000 < Date.now()) return null
    return typeof p.sub === 'string' ? p.sub : null
  } catch { return null }
}

// ── ŽMK definicijos iš DB (vieną kartą; fallback – engine default) ──────────
async function loadZmk(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON) { console.warn('[zmk] nėra SUPABASE_URL/ANON – naudojam default'); return }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/zmk_cards?select=*&order=sort_order`, { headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` } })
    if (r.ok) { zmkDefs = (await r.json()) as ZmkCardDef[]; console.log(`[zmk] ${zmkDefs.length} def.`) }
  } catch (e) { console.warn('[zmk]', (e as Error).message) }
}

// ── Room helpers ─────────────────────────────────────────────────────────────
function room(id: string): Room {
  let r = rooms.get(id)
  if (!r) { r = { id, seats: {}, userBySeat: {}, decks: {}, skins: {}, game: null, lastActivity: Date.now() }; rooms.set(id, r) }
  r.lastActivity = Date.now()
  return r
}
const other = (s: Seat): Seat => (s === 'you' ? 'ai' : 'you')

function send(c: Client | undefined, msg: unknown) {
  if (c && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg))
}
function event(c: Client | undefined, event: string, payload: unknown) { send(c, { t: 'event', event, payload }) }

function presence(r: Room) {
  const sides = (Object.keys(r.seats) as Seat[]).filter((s) => r.seats[s]?.ws.readyState === WebSocket.OPEN)
  for (const s of sides) send(r.seats[s], { t: 'presence', sides })
}

/** Būsena kiekvienam seat'ui: redaguota (priešo ranka/kaladė paslėpta) ir jo perspektyvoje. */
function pushState(r: Room) {
  if (!r.game) return
  for (const seat of ['you', 'ai'] as Seat[]) {
    const c = r.seats[seat]
    if (!c) continue
    // seat 'you' klientas darys swapPerspective → siunčiam jau apverstą; seat 'ai' – originalą.
    const view = redactForSeat(r.game, seat)
    event(c, 'state', seat === 'you' ? swapPerspective(view) : view)
  }
  if (r.game.winner) void onMatchEnd(r)
}

function tryCreateGame(r: Room) {
  if (r.game || !r.decks.you || !r.decks.ai) return
  const dy = r.decks.you, da = r.decks.ai
  seedRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0)
  const first: Side = Math.random() < 0.5 ? 'you' : 'ai'
  const g = createGame(
    dy.cards.map((c, i) => ({ ...c, uid: c.uid + '-y' + i })),
    da.cards.map((c, i) => ({ ...c, uid: c.uid + '-a' + i })),
    first,
    { zmkDefs, curseCards: dy.curses, curseCardsAi: da.curses, mulligan: true, mulliganBothManual: true },
  )
  if (!g.pendingMulligan) beginTurn(g)
  r.game = g
  console.log(`[room ${r.id}] partija sukurta, pirmas: ${first}`)
  pushState(r)
}

async function onMatchEnd(r: Room) {
  // TODO (Fazė C.2): rvn_report_match su service role + parašu – kol kas rezultatą
  // raportuoja klientai (kaip iki šiol). Kambarys paliekamas ROOM_TTL_MS reconnect'ui.
  console.log(`[room ${r.id}] baigta, laimėjo ${r.game?.winner}`)
}

function handleEvent(r: Room, c: Client, ev: string, payload: unknown) {
  r.lastActivity = Date.now()
  const opp = r.seats[other(c.seat)]
  switch (ev) {
    case 'deck': {
      const p = payload as { cards?: TutCard[]; curses?: TutCard[] }
      if (!r.game && p.cards && p.cards.length > 0) { r.decks[c.seat] = { cards: p.cards, curses: p.curses ?? [] }; tryCreateGame(r) }
      break
    }
    case 'hello': {
      if (r.game) pushState(r)
      if (r.skins[other(c.seat)] !== undefined) event(c, 'skin', { back: r.skins[other(c.seat)] })
      break
    }
    case 'action': {
      if (!r.game || r.game.winner) break
      // Klientas siunčia svečio koordinatėmis (swapAction). Seat 'ai' = tikras svečias → jau host koordinatės.
      // Seat 'you' klientas taip pat swap'ino → grąžinam atgal.
      const a = c.seat === 'you' ? swapAction(payload as NetAction) : (payload as NetAction)
      const why = notAllowed(r.game, c.seat, a)
      if (why) { event(c, 'reject', { reason: why }); break }
      const res = applyNetAction(r.game, a)
      if (!res.ok) event(c, 'reject', { reason: res.reason })
      pushState(r)
      break
    }
    case 'skin': { r.skins[c.seat] = (payload as { back?: unknown }).back ?? null; event(opp, 'skin', payload); break }
    case 'chat': case 'emote': { event(opp, ev, payload); break }
    case 'reqdeck': break
    default: break
  }
}

/**
 * Ėjimo/teisių validacija – engine'as (senas host modelis) pasitikėjo klientu, serveris ne:
 *  • veiksmai su actor (play/attack/endTurn/champ/discard/swapChampPhase): actor = seat IR seat aktyvus;
 *  • mulligan: actor = seat, kol laukiama jo mulligano;
 *  • resolve*: tik tas, kurio laukia pending (caster/side), o be aiškaus savininko – aktyvus seat.
 */
function notAllowed(g: GameState, seat: Seat, a: NetAction): string | null {
  const actor = (a as { actor?: Side }).actor
  if (a.t === 'mulligan') return actor === seat && g.pendingMulligan?.[seat] ? null : 'battleLog.err.notYourTurn'
  if (actor !== undefined) return actor === seat && g.active === seat ? null : 'battleLog.err.notYourTurn'
  const owner: Side | undefined =
    a.t === 'resolveSummon' ? g.pendingSummon?.caster :
    a.t === 'resolvePeek' ? g.pendingPeek?.caster :
    a.t === 'resolveArrange' ? g.pendingArrange?.caster :
    a.t === 'resolveCopy' ? g.pendingCopy?.caster :
    a.t === 'resolveReturn' ? g.pendingReturn?.side :
    a.t === 'resolveBattlecry' ? g.pendingBattlecry?.side :
    a.t === 'resolveLastwish' ? g.pendingLastwish?.side :
    a.t === 'resolveChoice' ? (g.pendingChoice?.chooser ?? g.pendingChoice?.caster) :
    undefined
  return (owner ?? g.active) === seat ? null : 'battleLog.err.notYourTurn'
}

function onDisconnect(r: Room, c: Client) {
  if (r.seats[c.seat] === c) delete r.seats[c.seat]
  presence(r)
  if (!r.game || r.game.winner) return
  if (r.graceTimer) clearTimeout(r.graceTimer)
  r.graceTimer = setTimeout(() => {
    if (!r.game || r.game.winner || r.seats[c.seat]) return
    const winner = other(c.seat)
    r.game.winner = winner
    r.game.log.push({ t: 'win', side: winner, key: 'battle.game.opponentNoShow' } as GameState['log'][number])
    pushState(r)
  }, DISCONNECT_GRACE_MS)
}

// ── HTTP + WS ────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, rules: RULES_VERSION, rooms: rooms.size, zmk: zmkDefs?.length ?? 'default' }))
    return
  }
  res.writeHead(404); res.end()
})
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  let client: Client | null = null
  let r: Room | null = null
  ws.on('message', async (raw) => {
    let m: { t: string; matchId?: string; side?: Seat; token?: string; event?: string; payload?: unknown }
    try { m = JSON.parse(String(raw)) } catch { return }
    if (m.t === 'join') {
      const userId = m.token ? await verifyToken(m.token) : null
      if (!userId || !m.matchId || (m.side !== 'you' && m.side !== 'ai')) { ws.send(JSON.stringify({ t: 'error', code: 'unauthorized' })); ws.close(); return }
      r = room(m.matchId)
      const owner = r.userBySeat[m.side]
      if (owner && owner !== userId) { ws.send(JSON.stringify({ t: 'error', code: 'room_full' })); ws.close(); return }
      r.userBySeat[m.side] = userId
      const prev = r.seats[m.side]
      if (prev && prev.ws !== ws) { try { prev.ws.close() } catch { /* */ } }
      client = { ws, userId, seat: m.side }
      r.seats[m.side] = client
      if (r.graceTimer) { clearTimeout(r.graceTimer); r.graceTimer = undefined }
      ws.send(JSON.stringify({ t: 'joined', seat: m.side, rules: RULES_VERSION }))
      presence(r)
      if (r.game) pushState(r)
      return
    }
    if (m.t === 'event' && client && r && m.event) handleEvent(r, client, m.event, m.payload)
  })
  ws.on('close', () => { if (client && r) onDisconnect(r, client) })
})

setInterval(() => {
  const now = Date.now()
  for (const [id, r] of rooms) if (now - r.lastActivity > ROOM_TTL_MS && Object.keys(r.seats).length === 0) rooms.delete(id)
}, 60_000)

loadZmk().then(() => server.listen(PORT, () => console.log(`Ravenof PvP server :${PORT} (${RULES_VERSION}, jwt ${JWT_SECRET ? 'verify' : 'DEV decode'})`)))
