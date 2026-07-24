// ── Ravenof UI Fazė 1 — lokalus Supabase mock (TIK vizualinei verifikacijai) ──
// Nedidelis HTTP serveris, imituojantis auth/REST/RPC atsakymus, kad dev serveris
// (SSR + klientas) galėtų atvaizduoti ekranus be tinklo. Produkcinis kodas ir
// .env.local NEKEIČIAMI — dev serveris paleidžiamas su env override:
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 npx next dev -p 3100
import http from 'node:http'
import fs from 'node:fs'

const PORT = Number(process.env.PORT ?? 54321)

export const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'vejobrolis@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { username: 'vejobrolis' }, created_at: '2026-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z' }
const PROFILE = { username: 'vejobrolis', display_name: 'VėjoBrolis', avatar_url: null, xp_total: 4200, gold: 12450, rubies: 320, essence: 1840, digital_onboarded_at: '2026-01-02T00:00:00Z', welcome_reward_claimed: true, active_deck_id: 'deck-1', role: 'user', email: 'vejobrolis@example.com' }

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


// ── Fazė 2 fixtūros ──
const DECKS = [
  { id: 'deck-1', name: 'Šalčio giesmė', faction_id: 5, visibility: 'private', card_count: 30, avg_gold_cost: 210, bound_avatar: null, updated_at: '2026-07-20T10:00:00Z', faction: { id: 5, name: 'Mistikos melodija', slug: 'mistikos-melodija', color_hex: '#526FAE', icon_url: null } },
  { id: 'deck-2', name: 'Kapų šauksmas', faction_id: 1, visibility: 'private', card_count: 30, avg_gold_cost: 240, bound_avatar: null, updated_at: '2026-07-19T10:00:00Z', faction: { id: 1, name: 'Mirties maršas', slug: 'mirties-marsas', color_hex: '#6F8562', icon_url: null } },
  { id: 'deck-3', name: 'Nebaigta kaladė', faction_id: 1, visibility: 'private', card_count: 22, avg_gold_cost: 300, bound_avatar: null, updated_at: '2026-07-18T10:00:00Z', faction: { id: 1, name: 'Mirties maršas', slug: 'mirties-marsas', color_hex: '#6F8562', icon_url: null } },
]
const FAC_COLORS = { 'mirties-marsas': '#6F8562', 'plesiku-naktis': '#6B6577', 'vryhioko-gauja': '#7650A4', 'demonu-orda': '#8D2D38', 'mistikos-melodija': '#526FAE', 'sviesos-pulkas': '#D4A33B', 'inkvizicijos-legionas': '#A85C32', 'rytu-vejas': '#4E8A7C', 'neutralus': '#B0A98F' }
const FACTION_ROWS = FACTIONS.map((f, i) => ({ id: i + 1, name: f.name, slug: f.slug, color_hex: FAC_COLORS[f.slug] ?? '#6F8562', icon_url: `/ravenof-ui/factions/${f.slug === 'neutralus' ? 'universalus' : f.slug}.png`, sort_order: i }))
const STARTERS = [
  { id: 'sd-1', name: 'Šalčio giesmė', description: 'Pradinė Mistikos melodijos kaladė.', imageUrl: '/cards/mistikos-melodija/Mistikos_Melodija_153.webp', priceGold: 0, faction: 'Mistikos melodija', factionId: 5, cardCount: 30, claimed: true, deckId: 'deck-1' },
  { id: 'sd-2', name: 'Kapų šauksmas', description: 'Pradinė Mirties maršo kaladė.', imageUrl: '/cards/mistikos-melodija/Mistikos_Melodija_154.webp', priceGold: 1500, faction: 'Mirties maršas', factionId: 1, cardCount: 30, claimed: false, deckId: null },
  { id: 'sd-3', name: 'Liepsnos orda', description: 'Pradinė Demonų ordos kaladė.', imageUrl: '/cards/mistikos-melodija/Mistikos_Melodija_159.webp', priceGold: 1500, faction: 'Demonų orda', factionId: 4, cardCount: 30, claimed: false, deckId: null },
  { id: 'sd-4', name: 'Rytų vėjas', description: 'Pradinė Rytų vėjo kaladė.', imageUrl: '/cards/mistikos-melodija/Mistikos_Melodija_153.webp', priceGold: 1500, faction: 'Rytų vėjas', factionId: 8, cardCount: 30, claimed: false, deckId: null },
]

// ── Fazė 3 fixtūros ──
const STARTER_CARDS = { cards: CARDS.slice(0, 8).map((c, i) => ({
  cardId: c.id, name: c.name, imageUrl: c.image_url, gold: c.gold_cost, attack: c.attack, health: c.health,
  effect: c.effect_text, isChampion: false, quantity: i < 4 ? 2 : 1, type: c.card_type.name,
  rarity: c.rarity.name, raritySort: c.rarity.sort_order, rarityColor: null,
})) }
const AVATARS = [
  { id: 'av-1', kind: 'avatar', name: 'Markas', description: null, priceGold: 0, css: null, emoji: null, imageUrl: '/cards/mistikos-melodija/Mistikos_Melodija_154.webp', ownedByDefault: true },
  { id: 'av-2', kind: 'avatar', name: 'Servina', description: null, priceGold: 0, css: null, emoji: null, imageUrl: '/cards/mistikos-melodija/Mistikos_Melodija_153.webp', ownedByDefault: true },
  { id: 'av-3', kind: 'avatar', name: 'Zanara', description: null, priceGold: 500, css: null, emoji: null, imageUrl: '/cards/mistikos-melodija/Mistikos_Melodija_159.webp', ownedByDefault: false },
]
const FRIENDS = [
  { id: 'fr-1', userId: 'u-1', username: 'TamsusRitis', displayName: 'TamsusRitis', avatar: null, presence: 'online', online: true, lastSeen: null, xp: 3200, unread: 2 },
  { id: 'fr-2', userId: 'u-2', username: 'Vakare99', displayName: 'Vakarė99', avatar: null, presence: 'online', online: true, lastSeen: null, xp: 1800, unread: 0 },
  { id: 'fr-3', userId: 'u-3', username: 'GelezinisVilkas', displayName: 'GeležinisVilkas', avatar: null, presence: 'away', online: true, lastSeen: null, xp: 5400, unread: 0 },
  { id: 'fr-4', userId: 'u-4', username: 'Menulio_Sesuo', displayName: 'Mėnulio_Sesuo', avatar: null, presence: 'dnd', online: true, lastSeen: null, xp: 900, unread: 0 },
  { id: 'fr-5', userId: 'u-5', username: 'KauluKaralius', displayName: 'KaulųKaralius', avatar: null, presence: 'offline', online: false, lastSeen: new Date(Date.now() - 3 * 3600e3).toISOString(), xp: 2100, unread: 0 },
]
const CONVERSATION = [
  { id: 'm-1', fromMe: false, body: 'Sveikas! Matei naują Mistikos kaladę?', createdAt: new Date(Date.now() - 3600e3).toISOString(), readAt: null, clientId: null },
  { id: 'm-2', fromMe: false, body: 'Sužaidžiam draugišką?', createdAt: new Date(Date.now() - 1800e3).toISOString(), readAt: null, clientId: null },
]
const CAMPAIGNS = [
  { id: 'c-1', slug: 'pelenu-zygis', title: 'Pelenų žygis', subtitle: null, description: null, cover_image_url: '/cards/mistikos-melodija/Mistikos_Melodija_154.webp', campaign_type: 'story', lore_period: null, related_factions: ['Mirties maršas'], map_image_url: null, start_node_id: null, visibility: 'active', required_level: 0, sort_order: 1 },
  { id: 'c-2', slug: 'kaulu-katedra', title: 'Kaulų katedra', subtitle: null, description: null, cover_image_url: '/cards/mistikos-melodija/Mistikos_Melodija_153.webp', campaign_type: 'story', lore_period: null, related_factions: ['Vryhioko gauja'], map_image_url: null, start_node_id: null, visibility: 'active', required_level: 0, sort_order: 2 },
  { id: 'c-3', slug: 'paskendes-dvaras', title: 'Paskendęs dvaras', subtitle: null, description: null, cover_image_url: '/cards/mistikos-melodija/Mistikos_Melodija_159.webp', campaign_type: 'story', lore_period: null, related_factions: ['Rytų vėjas'], map_image_url: null, start_node_id: null, visibility: 'active', required_level: 0, sort_order: 3 },
]
const CAMPAIGN_BOSSES = { 'c-1': 'Griuvėsių Sargas', 'c-2': 'Šešėlių Vyskupas', 'c-3': 'Paskendusi Karalienė' }
const campaignNodes = (cid) => Array.from({ length: 6 }, (_, i) => ({
  id: `${cid}-n${i + 1}`, campaign_id: cid, chapter_id: null,
  title: i === 5 ? CAMPAIGN_BOSSES[cid] : `Misija ${i + 1}`, subtitle: null, description: null, lore_text: null,
  pos_x: 10 + i * 15, pos_y: 50, icon_type: i === 5 ? 'boss' : 'battle',
  mission_type: i === 5 ? 'BOSS_BATTLE' : 'STANDARD_BATTLE', unlock_rule: { type: 'all_prev' },
  prev_node_ids: i ? [`${cid}-n${i}`] : [], next_node_ids: i < 5 ? [`${cid}-n${i + 2}`] : [],
  objectives: [], battle_config: {}, scenario: {}, reward_payload: {}, replay: { allowed: true }, difficulty: {}, status: 'active', sort_order: i,
}))
const CAMPAIGN_DONE = { 'c-1': 6, 'c-2': 3, 'c-3': 0 }
const SHOP_ITEMS = [
  { id: 1, slug: 'mistikos-pakuote', itemType: 'pack', name: 'Mistikos pakuotė', description: '5 kortos · bent 1 magiška', rarity: null, payload: [{ item_id: 'pack-1', type: 'pack', qty: 1 }], sortOrder: 1, prices: { silver: 500, rubies: null, real_money: null } },
  { id: 2, slug: 'mirties-pakuote', itemType: 'pack', name: 'Mirties pakuotė', description: '5 kortos · bent 1 magiška', rarity: null, payload: [{ item_id: 'pack-2', type: 'pack', qty: 1 }], sortOrder: 2, prices: { silver: 500, rubies: null, real_money: null } },
  { id: 3, slug: 'didzioji-pakuote', itemType: 'pack', name: 'Didžioji pakuotė', description: '5 kortos · bent 1 epiška+', rarity: null, payload: [{ item_id: 'pack-3', type: 'pack', qty: 1 }], sortOrder: 3, prices: { silver: null, rubies: 300, real_money: null } },
]
const CARD_PACKS = [
  { id: 'pack-1', name: 'Mistikos pakuotė', description: null, price_gold: 500, sort_order: 1, image_url: '/cards/mistikos-melodija/Mistikos_Melodija_159.webp' },
  { id: 'pack-2', name: 'Mirties pakuotė', description: null, price_gold: 500, sort_order: 2, image_url: '/cards/mistikos-melodija/Mistikos_Melodija_154.webp' },
  { id: 'pack-3', name: 'Didžioji pakuotė', description: null, price_gold: 0, sort_order: 3, image_url: '/cards/mistikos-melodija/Mistikos_Melodija_153.webp' },
]

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
  rvn_friends_list: { friends: FRIENDS, pending: [], me: { presenceStatus: 'auto' } },
  rvn_heartbeat: null,
  rvn_challenge_incoming: [],
  rvn_trade_incoming: [],
  rvn_get_starter_decks: { decks: STARTERS },
  rvn_get_starter_deck_cards: STARTER_CARDS,
  rvn_dm_overview: FRIENDS.filter((f) => f.unread > 0).map((f) => ({ friendId: f.userId, username: f.username, displayName: f.displayName, avatar: f.avatar, presence: f.presence, unread: f.unread })),
  rvn_conversation: CONVERSATION,
  rvn_dm_mark_read: null,
  rvn_set_presence: null,
  rvn_campaign_state: (params) => {
    const cid = params?.p_campaign ?? 'c-3'
    const done = CAMPAIGN_DONE[cid] ?? 0
    return {
      campaignId: cid,
      completedNodeIds: Array.from({ length: done }, (_, i) => `${cid}-n${i + 1}`),
      unlockedNodeIds: [`${cid}-n${Math.min(done + 1, 6)}`],
      nodeStars: {}, nodeObjectives: {}, failedAttempts: {}, rewardsClaimed: [], choices: {}, cutscenesWatched: [], currentChapterId: null, lastNodeId: null, difficulty: null,
    }
  },
  rvn_get_shop: SHOP_ITEMS,
  rvn_leaderboard: [
    { position: 1, is_bot: true, entity_id: 'b1', name: 'JuodasisKrankly', avatar: null, rank_step: 141, rank_number: 3, medal_tier: 'gold', wins: 60, losses: 10 },
    { position: 2, is_bot: true, entity_id: 'b2', name: 'RagananėVirš', avatar: null, rank_step: 135, rank_number: 5, medal_tier: 'gold', wins: 55, losses: 12 },
    { position: 3, is_bot: true, entity_id: 'b3', name: 'Šešėlis_LT', avatar: null, rank_step: 126, rank_number: 8, medal_tier: 'gold', wins: 50, losses: 14 },
  ],
  rvn_get_ranked_decks: DECKS.map((d) => ({ id: d.id, name: d.name, faction: d.faction.name, factionIcon: null, factionColor: d.faction.color_hex })),
  rvn_get_cosmetics: { items: AVATARS, owned: [], equippedCardBack: null, equippedBoard: null, equippedAvatar: null },
  rvn_get_daily_deal: { cards: [] },
  rvn_maybe_simulate_bot_matches: null,
  rvn_set_active_deck: { ok: true },
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
  // Testų valdymo endpointas: PROFILE laukų perrašymas (pvz. digital_onboarded_at=null
  // onboarding ekrano capture'ui) — TIK mock aplinkoje.
  if (p === '/__mock/profile') {
    let raw = ''
    req.on('data', (ch) => { raw += ch })
    req.on('end', () => {
      try { Object.assign(PROFILE, JSON.parse(raw || '{}')) } catch { /* */ }
      send({ ok: true, profile: PROFILE })
    })
    return
  }
  if (p === '/font.woff2') { res.writeHead(200, { 'content-type': 'font/woff2', ...CORS }); return res.end(fs.readFileSync('public/ravenof-ui/fonts/cinzel-latin-wght-normal.woff2')) }
  if (p.startsWith('/auth/v1/user')) return send(USER)
  if (p.startsWith('/auth/v1/token')) return send({ access_token: 'mock.mock.mock', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'mock-refresh', user: USER })
  if (p.startsWith('/auth/v1/')) return send({})
  if (p.startsWith('/rest/v1/rpc/')) {
    const name = p.split('/rest/v1/rpc/')[1]
    const val = Object.prototype.hasOwnProperty.call(RPC, name) ? RPC[name] : null
    if (typeof val !== 'function') return send(val)
    // RPC su parametrais (pvz. rvn_campaign_state) — perskaitom POST body
    let raw = ''
    req.on('data', (ch) => { raw += ch })
    req.on('end', () => {
      let params = null
      try { params = raw ? JSON.parse(raw) : null } catch { /* */ }
      send(val(params))
    })
    return
  }
  if (p.startsWith('/rest/v1/campaign_nodes')) {
    const m = /campaign_id=eq\.([^&]+)/.exec(url.search)
    return send(m ? campaignNodes(decodeURIComponent(m[1])) : [])
  }
  if (p.startsWith('/rest/v1/campaign_')) return send([])
  if (p.startsWith('/rest/v1/campaigns')) {
    const mid = /(?:id|slug)=eq\.([^&]+)/.exec(url.search)
    if (mid) {
      const v = decodeURIComponent(mid[1])
      return send(CAMPAIGNS.find((c) => c.id === v || c.slug === v) ?? null)
    }
    return send(CAMPAIGNS)
  }
  if (p.startsWith('/rest/v1/pvp_matches')) return send([])
  if (p.startsWith('/rest/v1/profiles')) {
    // maybeSingle → objektas; .in('id', ...) sąrašo užklausos → eilučių masyvas
    const wantsObj = String(req.headers.accept ?? '').includes('vnd.pgrst.object')
    return send(wantsObj ? PROFILE : [{ id: USER.id, ...PROFILE }])
  }
  if (p.startsWith('/rest/v1/notifications')) {
    if (req.method === 'HEAD') { res.writeHead(200, { ...CORS, 'content-range': '*/3' }); return res.end() }
    return send([], 200, { 'content-range': '*/3' })
  }
  if (p.startsWith('/rest/v1/cards')) return send(CARDS)
  if (p.startsWith('/rest/v1/decks')) return send(DECKS)
  if (p.startsWith('/rest/v1/deck_cards')) return send([])
  if (p.startsWith('/rest/v1/factions')) return send(FACTION_ROWS)
  if (p.startsWith('/rest/v1/card_packs')) return send(CARD_PACKS)
  if (p.startsWith('/rest/v1/user_collections')) return send(COLLECTION_ROWS)
  if (p.startsWith('/rest/v1/')) return send([])
  return send([])
}).listen(PORT, () => console.log(`[ravenof-ui-mock] listening on :${PORT}`))
