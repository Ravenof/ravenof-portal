// ── verify-receipt (Supabase Edge Function, Deno) ────────────────────────────
// POST { platform: 'google'|'apple'|'steam', productId, token, ... } su vartotojo JWT.
// Patikrina kvitą platformos API ir kviečia rvn_grant_purchase (service role).
// ENV (Supabase secrets): GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_PACKAGE_NAME,
//   APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID,
//   STEAM_WEB_API_KEY, STEAM_APP_ID
// Būklė: karkasas – Google patikra įgyvendinta (androidpublisher v3), Apple/Steam – TODO.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// CORS: klientas (Capacitor WebView https://localhost / web) kviečia per functions.invoke
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, init: { status?: number } = {}) => new Response(JSON.stringify(b), { status: init.status ?? 200, headers: { ...CORS, 'content-type': 'application/json' } })

async function googleAccessToken(): Promise<string> {
  const sa = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')!)
  const now = Math.floor(Date.now() / 1000)
  const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const header = enc({ alg: 'RS256', typ: 'JWT' })
  const claim = enc({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '')
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`)))
  const jwt = `${header}.${claim}.${btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}` })
  return (await r.json()).access_token
}

async function verifyGoogle(productId: string, token: string, userId: string) {
  const pkg = Deno.env.get('GOOGLE_PACKAGE_NAME')!
  const at = await googleAccessToken()
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`
  const r = await fetch(base, { headers: { authorization: `Bearer ${at}` } })
  const j = await r.json()
  // purchaseState: 0 = purchased, 1 = canceled, 2 = pending
  // obfuscatedExternalAccountId = žaidėjo id, perduotas pirkimo metu (appAccountToken) –
  // svetimo žaidėjo kvito „perpanaudoti" negalima.
  const acc = j.obfuscatedExternalAccountId as string | undefined
  const ok = r.ok && j.purchaseState === 0 && (!acc || acc === userId)
  // Vartojamas produktas: suvartojam (consume = ir acknowledge), kad būtų galima pirkti vėl.
  const consume = async () => {
    if (j.consumptionState === 1) return
    try { await fetch(`${base}:consume`, { method: 'POST', headers: { authorization: `Bearer ${at}` } }) } catch { /* kitą kartą per recovery */ }
  }
  return { ok, externalId: j.orderId ?? token, raw: j, consume }
}

async function verifyApple(_productId: string, _transactionId: string) {
  // TODO: App Store Server API (JWS transaction decode + /inApps/v1/transactions/{id})
  return { ok: false, externalId: '', raw: { todo: 'apple' } }
}
async function verifySteam(_productId: string, _orderId: string) {
  // TODO: ISteamMicroTxn/FinalizeTxn + GetReport (Steam Web API)
  return { ok: false, externalId: '', raw: { todo: 'steam' } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('POST', { status: 405, headers: CORS })
  const auth = req.headers.get('authorization') ?? ''
  const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  if (!user) return json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as { platform?: string; productId?: string; token?: string } | null
  if (!body?.platform || !body.productId || !body.token) return json({ error: 'bad request' }, { status: 400 })

  const v: { ok: boolean; externalId: string; raw: unknown; consume?: () => Promise<void> } = body.platform === 'google' ? await verifyGoogle(body.productId, body.token, user.id)
    : body.platform === 'apple' ? await verifyApple(body.productId, body.token)
    : body.platform === 'steam' ? await verifySteam(body.productId, body.token)
    : { ok: false, externalId: '', raw: {} }
  if (!v.ok) return json({ error: 'receipt invalid', raw: v.raw }, { status: 402 })

  const { data, error } = await admin.rpc('rvn_grant_purchase', { p_user: user.id, p_platform: body.platform, p_product: body.productId, p_external: v.externalId, p_raw: v.raw })
  if (error) return json({ error: error.message }, { status: 500 })
  // Suteikta (arba jau buvo suteikta anksčiau – duplicate) → galima suvartoti pirkinį
  await v.consume?.()
  return json(data)
})
