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

let client = null

function init() {
  try {
    const sw = require('steamworks.js')
    const appId = Number(process.env.STEAM_APPID || require('node:fs').readFileSync(require('node:path').join(__dirname, 'steam_appid.txt'), 'utf8').trim())
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
  try { return { steamId: client.localplayer.getSteamId().steamId64, name: client.localplayer.getName() } } catch { return null }
}

function shutdown() { client = null }

module.exports = { init, unlock, player, shutdown }
