// ── Ravenof UI Fazė 1 — lokalus Supabase mock (TIK vizualinei verifikacijai) ──
// Nedidelis HTTP serveris, imituojantis auth/REST/RPC atsakymus, kad dev serveris
// (SSR + klientas) galėtų atvaizduoti ekranus be tinklo. Produkcinis kodas ir
// .env.local NEKEIČIAMI — dev serveris paleidžiamas su env override:
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 npx next dev -p 3100
import http from 'node:http'
import fs from 'node:fs'

const PORT = Number(process.env.PORT ?? 54321)

export const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'vejobrolis@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { username: 'vejobrolis' }, created_at: '2026-01-01T00:00:00Z' }
const PROFILE = { username: 'vejobrolis', display_name: 'VėjoBrolis', avatar_url: null, xp_total: 4200, gold: 12450, rubies: 320, essence: 1840, digital_onboarded_at: '2026-01-02T00:00:00Z', welcome_reward_claimed: true }

const CARD_NAMES = ['Vilnė Saulinė', 'Skausmo šauklys', 'Vėlių šauklė', 'Markas Žalvarnis', 'Servina Sidabrė', 'Nakties klajūnas']
const CARD_IMGS = [
  '/cards/mistikos-melodija/Mistikos_Melodija_159.webp',
  '/cards/mistikos-melodija/Mistikos_Melodija_154.webp',
  '/cards/mistikos-melodija/Mistikos_Melodija_153.webp',
]
const RARITIES = [
  { name: 'Paprastas', copy_limit: 2, sort_order: 1 },
  { name: 'Magiškas', copy_limit: 2, sort_order: 2 },
  { name: 'Unikalus', copy_limit: 1, sort_order: 3 },
  { name: 'Epiškas', copy_limit: 1, sort_order: 4 },
  { name: 'Legendinis', copy_limit: 1, sort_order: 5 },
]
const FACTIONS = [
  { name: 'Mirties maršas', slug: 'mirties-marsas' },
  { name: 'Plėšikų naktis', slug: 'plesiku-naktis' },
  { name: 'Vryhioko gauja', slug: 'vryhioko-gauja' },
  { name: 'Demonų orda', slug: 'demonu-orda' },
  { name: 'Mistikos melodija', slug: 'mistikos-melodija' },
  { name: 'Šviesos pulkas', slug: 'sviesos-pulkas' },
  { name: 'Inkvizicijos legionas', slug: 'inkvizicijos-legionas' },
  { name: 'Rytų vėjas', slug: 'rytu-vejas' },
  { name: 'Neutralūs', slug: 'neutralus' },
]
const TYPES = ['Būtybė', 'Artefaktas', 'Reakcija', 'Laukas', 'Burtas', 'Prakeiksmas', 'Čempionas']
const COSTS = [100, 200, 400, 500, 100, 200]
const OWNED = [3, 2, 4, 2, 2, 4]
const CARDS = Array.from({ length: 40 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  name: CARD_NAMES[i % CARD_NAMES.length],
  image_url: CARD_IMGS[i % CARD_IMGS.length],
  gold_cost: COSTS[i % COSTS.length],
  attack: (i % 4) + 1, health: (i % 3) + 1,
  description: null,
  effect_text: i % 2 === 0 ? 'Šauksmas — traukite kortą.' : '∞ — Gali būti iškviestas vietoje „Zombis".',
  is_champion: false,
  faction: FACTIONS[i % FACTIONS.length],
  card_type: { name: TYPES[i % TYPES.length] },
  rarity: RARITIES[i % RARITIES.length],
}))
const COLLECTION_ROWS = CARDS.map((c, i) => ({ card_id: c.id, quantity: OWNED[i % OWNED.length] }))

const RPC = {
  rvn_get_daily_tasks: {
    dateKey: '2026-07-23',
    tasks: [
      { id: 1, templateId: 1, difficulty: 'easy', objectiveType: 'wins', title: 'Laimėk 2 kovas', description: '', progress: 2, target: 2, rewardPayload: [], completed: true, claimed: false },
      { id: 2, templateId: 2, difficulty: 'medium', objectiveType: 'play', title: 'Sužaisk 3 Mistikos kortas', description: '', progress: 1, target: 3, rewardPayload: [], completed: false, claimed: false },
      { id: 3, templateId: 3, difficulty: 'hard', objectiveType: 'kill', title: 'Sunaikink 5 būtybes', description: '', progress: 3, target: 5, rewardPayload: [], completed: false, claimed: false },
    ],
    allDone: false, chestClaimed: false, reroll: { freeUsed: false, paidCount: 0 },
  },
  rvn_login_checkin: { already: true, reward: 0, streak: 12 },
  rvn_get_monthly_login: { claimedToday: true, nextDay: 24, daysInMonth: 31, rewards: [] },
  rvn_get_season_path: { level: 7, levels: 20, xp: 0, xpForNext: 100, hasPass: false, rows: [] },
  rvn_ensure_ranked_profile: { user_id: USER.id, season_id: 's1', rank_step: 82, loss_counter: 0, wins: 23, losses: 9, wins_vs_real: 0, losses_vs_real: 0, win_streak: 2, best_win_streak: 5, best_rank_step: 84, reached_numbers: [], portal_exp_earned: 0, ranked_gold_earned: 0, creatures_killed: 0 },
  rvn_active_season: { id: 's1', name: 'III', start_date: '2026-06-01', end_date: new Date(Date.now() + 41 * 864e5).toISOString(), is_active: true, reset_completed: false, created_at: '', updated_at: '' },
  rvn_get_craft_config: { config: { craft: { 1: 100, 2: 400, 3: 6400, 4: 1600, 5: 3200, 6: 3200 }, disenchant: { 1: 20, 2: 100, 3: 1600, 4: 400, 5: 800, 6: 800 } }, essence: 1840 },
  rvn_friends_list: { friends: [], incoming: [], outgoing: [] },
  rvn_heartbeat: null,
  rvn_challenge_incoming: [],
  rvn_get_starter_decks: [{ id: 'sd1', claimed: true }],
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
  'access-control-expose-headers': 'content-range',
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const p = url.pathname
  const send = (body, status = 200, extra = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', ...CORS, ...extra })
    res.end(body === undefined ? '' : JSON.stringify(body))
  }
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end() }
  if (p === '/font.woff2') { res.writeHead(200, { 'content-type': 'font/woff2', ...CORS }); return res.end(fs.readFileSync('public/ravenof-ui/fonts/cinzel-latin-wght-normal.woff2')) }
  if (p.startsWith('/auth/v1/user')) return send(USER)
  if (p.startsWith('/auth/v1/token')) return send({ access_token: 'mock.mock.mock', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'mock-refresh', user: USER })
  if (p.startsWith('/auth/v1/')) return send({})
  if (p.startsWith('/rest/v1/rpc/')) {
    const name = p.split('/rest/v1/rpc/')[1]
    return send(Object.prototype.hasOwnProperty.call(RPC, name) ? RPC[name] : null)
  }
  if (p.startsWith('/rest/v1/profiles')) return send(PROFILE)
  if (p.startsWith('/rest/v1/notifications')) {
    if (req.method === 'HEAD') { res.writeHead(200, { ...CORS, 'content-range': '*/3' }); return res.end() }
    return send([], 200, { 'content-range': '*/3' })
  }
  if (p.startsWith('/rest/v1/cards')) return send(CARDS)
  if (p.startsWith('/rest/v1/user_collections')) return send(COLLECTION_ROWS)
  if (p.startsWith('/rest/v1/')) return send([])
  return send([])
}).listen(PORT, () => console.log(`[ravenof-ui-mock] listening on :${PORT}`))
