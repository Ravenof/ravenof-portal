// ── Steamworks integracija (pasirenkama) ─────────────────────────────────────
// steamworks.js kraunama tik jei įdiegta ir yra steam_appid.txt (dev) / Steam klientas.
// Achievement'ai: badges → Steam API vardai (žr. ACH_MAP). Cloud saves – Steam Auto-Cloud
// (nustatoma Steamworks partner'yje: %APPDATA%/ravenof-desktop/IndexedDB ir Local Storage).
const ACH_MAP = {
  // badge slug (Supabase badges.slug) → Steam achievement API name
  first_win: 'ACH_FIRST_WIN',
  ten_wins: 'ACH_TEN_WINS',
  collector_100: 'ACH_COLLECTOR_100',
}

// Steam App ID: paleidus per Steam – SteamAppId env; dev – STEAM_APPID / steam_appid.txt;
// kitaip – DEFAULT_APP_ID. 480 = Valve testinis „Spacewar" (kol gausim tikrą App ID).
const DEFAULT_APP_ID = 480
const AUTH_IDENTITY = 'ravenof'   // turi sutapti su supabase/functions/steam-auth IDENTITY

let client = null
let lastTicket = null

function readAppId() {
  const env = process.env.SteamAppId || process.env.STEAM_APPID
  if (env && Number(env)) return Number(env)
  try { const t = require('node:fs').readFileSync(require('node:path').join(__dirname, 'steam_appid.txt'), 'utf8').trim(); if (Number(t)) return Number(t) } catch { /* nėra */ }
  return DEFAULT_APP_ID
}

function init() {
  try {
    const sw = require('steamworks.js')
    const appId = readAppId()
    if (!appId) return
    client = sw.init(appId)
    sw.electronEnableSteamOverlay()
    console.log('[steam] prisijungta:', client.localplayer.getName())
  } catch (e) {
    console.log('[steam] nėra (dev / be Steam):', e.message)
  }
}

function unlock(badgeSlug) {
  const name = ACH_MAP[badgeSlug]
  if (!client || !name) return false
  try { client.achievement.activate(name); return true } catch { return false }
}

function player() {
  if (!client) return null
  try { return { steamId: String(client.localplayer.getSteamId().steamId64), name: client.localplayer.getName() } } catch { return null }
}

/** Web API bilietas serveriui (steam-auth edge funkcija). null – Steam nėra / nepavyko. */
async function authTicket() {
  if (!client) return null
  try {
    try { lastTicket?.cancel?.() } catch { /* */ }
    const t = await client.auth.getAuthTicketForWebApi(AUTH_IDENTITY)
    lastTicket = t
    const p = player()
    return { ticket: Buffer.from(t.getBytes()).toString('hex'), steamId: p?.steamId ?? null, persona: p?.name ?? null }
  } catch (e) {
    console.log('[steam] auth ticket nepavyko:', e.message)
    return null
  }
}

function shutdown() { try { lastTicket?.cancel?.() } catch { /* */ } client = null }

module.exports = { init, unlock, player, authTicket, shutdown }
