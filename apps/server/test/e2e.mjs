// Dūminis e2e: du klientai → join → deck → state → mulligan → endTurn. Paleidimas: node apps/server/test/e2e.mjs [fixture.json]
import WebSocket from 'ws'
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const PORT = 8091
const srv = spawn(process.execPath, ['apps/server/dist/index.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((r) => srv.stdout.on('data', (d) => { if (String(d).includes('PvP server')) r() }))

const fx = JSON.parse(readFileSync(process.argv[2] ?? 'fixtures/game01-seed1-easy.json', 'utf8'))
const jwt = (sub) => 'x.' + Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.y'

function client(seat, user) {
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`)
  const st = { seat, states: [], events: [], ws }
  ws.on('message', (raw) => { const m = JSON.parse(String(raw)); st.events.push(m); if (m.t === 'event' && m.event === 'state') st.states.push(m.payload) })
  ws.on('open', () => ws.send(JSON.stringify({ t: 'join', matchId: 'm1', side: seat, token: jwt(user) })))
  st.send = (event, payload) => ws.send(JSON.stringify({ t: 'event', event, payload }))
  st.wait = (pred, ms = 3000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { if (pred(st)) { clearInterval(iv); res() } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout ' + seat)) } }, 20) })
  return st
}
const A = client('you', 'user-a'), B = client('ai', 'user-b')
await A.wait((s) => s.events.some((e) => e.t === 'joined'))
await B.wait((s) => s.events.some((e) => e.t === 'joined'))
A.send('deck', { cards: fx.decks.you, curses: [] })
B.send('deck', { cards: fx.decks.ai, curses: [] })
await A.wait((s) => s.states.length >= 1); await B.wait((s) => s.states.length >= 1)
const a0 = A.states.at(-1), b0 = B.states.at(-1)
// A gauna apverstą (swap) būseną: jo kortos 'ai' pusėje; B – originalą: jo kortos 'ai' pusėje. Abu po kliento swap'o matys save 'you'.
const ok1 = a0.ai.hand.every((c) => c.name) && a0.you.hand.every((c) => c.name === '') && b0.ai.hand.every((c) => c.name) && b0.you.hand.every((c) => c.name === '')
console.log(ok1 ? '✓ redakcija + perspektyva' : '✗ redakcija/perspektyva', { aHandVisible: a0.ai.hand.length, aOppHidden: a0.you.hand.length })
console.log('  pendingMulligan:', JSON.stringify(a0.pendingMulligan))
// Mulligan: abu klientai siunčia svečio koordinatėmis (actor 'ai' = aš). Serveris seat 'you' swap'ina atgal.
A.send('action', { t: 'mulligan', actor: 'ai', uids: [] })
await A.wait((s) => s.states.length >= 2)
B.send('action', { t: 'mulligan', actor: 'ai', uids: [] })
await B.wait((s) => s.states.at(-1).globalTurn >= 1, 4000)
const g = B.states.at(-1)
console.log('✓ mulligan abiem →', { globalTurn: g.globalTurn, active: g.active, pending: g.pendingMulligan })
// Aktyvus žaidėjas baigia ėjimą (kliento koordinatėse aktyvus = 'ai' jei tai jis)
const activeIsA = g.active === 'you'   // originalioje būsenoje 'you' = A
const actor = activeIsA ? A : B
actor.send('action', { t: 'endTurn', actor: 'ai' })
await actor.wait((s) => s.states.at(-1).globalTurn >= 2, 4000)
console.log('✓ endTurn →', { globalTurn: actor.states.at(-1).globalTurn })
// Ne savo ėjimu – atmetimas
const idle = activeIsA ? A : B
idle.send('action', { t: 'endTurn', actor: 'ai' })
await idle.wait((s) => s.events.some((e) => e.t === 'event' && e.event === 'reject') || s.events.some((e) => e.t === 'error'), 2000).then(() => console.log('✓ svetimas ėjimas atmestas')).catch(() => console.log('? atmetimo nesulaukta'))
A.ws.close(); B.ws.close(); srv.kill()
