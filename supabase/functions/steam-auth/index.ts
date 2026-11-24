// ── steam-auth (Supabase Edge Function, Deno) ─────────────────────────────────
// Prisijungimas per Steam (Electron desktop versija).
// Klientas: steamworks.js getAuthTicketForWebApi('ravenof') → POST { ticket } (hex).
// Funkcija: ISteamUserAuth/AuthenticateUserTicket patikrina bilietą → Steam ID →
//   • jei kviečia prisijungęs žaidėjas (ne svečias) – susieja Steam su JO paskyra;
//   • jei Steam ID jau susietas – prijungia prie tos paskyros;
//   • jei kviečia svečias – svečio paskyra paverčiama Steam paskyra (progresas lieka);
//   • kitaip – sukuriama nauja paskyra (slapyvardis = Steam vardas).
// Sesija: admin.generateLink(magiclink) → token_hash → klientas verifyOtp (laiškas NEsiunčiamas).
// ENV: STEAM_WEB_API_KEY (Steamworks publisher Web API key), STEAM_APP_ID,
//      STEAM_API_HOST (numatyta partner.steam-api.com; vartotojo raktui – api.steampowered.com)
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const IDENTITY = 'ravenof'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'content-type': 'application/json' } })
const pseudoEmail = (steamId: string) => `steam_${steamId}@steam.ravenof.lt`

async function verifyTicket(ticket: string): Promise<{ steamId: string } | { error: string; raw?: unknown }> {
  const key = Deno.env.get('STEAM_WEB_API_KEY'), appid = Deno.env.get('STEAM_APP_ID')
  if (!key || !appid) return { error: 'steam not configured' }
  const host = Deno.env.get('STEAM_API_HOST') || 'partner.steam-api.com'
  const url = `https://${host}/ISteamUserAuth/AuthenticateUserTicket/v1/?key=${encodeURIComponent(key)}&appid=${encodeURIComponent(appid)}&ticket=${encodeURIComponent(ticket)}&identity=${IDENTITY}`
  const r = await fetch(url)
  const j = await r.json().catch(() => null) as { response?: { params?: { result?: string; steamid?: string; vacbanned?: boolean; publisherbanned?: boolean }; error?: unknown } } | null
  const p = j?.response?.params
  if (!r.ok || p?.result !== 'OK' || !p.steamid) return { error: 'ticket invalid', raw: j ?? r.status }
  if (p.publisherbanned) return { error: 'banned' }
  return { steamId: p.steamid }
}

async function sessionFor(email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data?.properties?.hashed_token) throw new Error(error?.message ?? 'no link')
  return { token_hash: data.properties.hashed_token, email }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST' }, 405)
  const body = await req.json().catch(() => null) as { ticket?: string; persona?: string } | null
  const ticket = body?.ticket?.trim()
  if (!ticket || !/^[0-9a-fA-F]+$/.test(ticket)) return json({ error: 'bad request' }, 400)

  const v = await verifyTicket(ticket)
  if ('error' in v) { console.error('steam verify failed', JSON.stringify(v).slice(0, 800)); return json({ error: v.error }, 401) }
  const steamId = v.steamId
  const persona = (body?.persona ?? '').slice(0, 32) || null

  // Kas kviečia? (anon raktas → nėra vartotojo)
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: { user: caller } } = await admin.auth.getUser(jwt).catch(() => ({ data: { user: null } }))

  const { data: link } = await admin.from('steam_accounts').select('user_id').eq('steam_id', steamId).maybeSingle()
  try {
    // 1) Steam ID jau susietas → prisijungiam prie tos paskyros
    if (link?.user_id) {
      await admin.from('steam_accounts').update({ last_login: new Date().toISOString(), persona }).eq('steam_id', steamId)
      if (caller && caller.id === link.user_id) return json({ ok: true, linked: true, already: true })
      const { data: u } = await admin.auth.admin.getUserById(link.user_id)
      if (!u?.user?.email) return json({ error: 'account has no email' }, 500)
      return json({ ok: true, ...(await sessionFor(u.user.email)) })
    }
    // 2) Prisijungęs žaidėjas – susiejam su juo
    if (caller) {
      const { data: mine } = await admin.from('steam_accounts').select('steam_id').eq('user_id', caller.id).maybeSingle()
      if (mine) return json({ error: 'another steam account linked' }, 409)
      if (caller.is_anonymous || !caller.email) {
        // Svečias → nuolatinė Steam paskyra (tas pats user id, progresas lieka)
        const { error } = await admin.auth.admin.updateUserById(caller.id, { email: pseudoEmail(steamId), email_confirm: true, user_metadata: { ...caller.user_metadata, steam_id: steamId, guest: false } })
        if (error) throw error
      }
      await admin.from('steam_accounts').insert({ steam_id: steamId, user_id: caller.id, persona })
      return json({ ok: true, linked: true })
    }
    // 3) Nauja paskyra
    const email = pseudoEmail(steamId)
    const uname = (persona ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20)
    const { data: created, error } = await admin.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { username: uname.length >= 3 ? uname : `steam_${steamId.slice(-6)}`, display_name: persona ?? `Steam ${steamId.slice(-4)}`, steam_id: steamId, provider: 'steam' },
    })
    if (error || !created?.user) throw error ?? new Error('create failed')
    await admin.from('steam_accounts').insert({ steam_id: steamId, user_id: created.user.id, persona })
    return json({ ok: true, created: true, ...(await sessionFor(email)) })
  } catch (e) {
    console.error('steam-auth', e instanceof Error ? e.message : e)
    return json({ error: 'server' }, 500)
  }
})
