// ── verify-receipt (Supabase Edge Function, Deno) ────────────────────────────
// POST { platform: 'google'|'apple'|'steam', productId, token, ... } su vartotojo JWT.
// Patikrina kvitą platformos API ir kviečia rvn_grant_purchase (service role).
// ENV (Supabase secrets): GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_PACKAGE_NAME,
//   APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID,
//   STEAM_WEB_API_KEY, STEAM_APP_ID
// Būklė: karkasas – Google patikra įgyvendinta (androidpublisher v3), Apple/Steam – TODO.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

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

async function verifyGoogle(productId: string, token: string) {
  const pkg = Deno.env.get('GOOGLE_PACKAGE_NAME')!
  const at = await googleAccessToken()
  const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${productId}/tokens/${token}`, { headers: { authorization: `Bearer ${at}` } })
  const j = await r.json()
  // purchaseState 0 = purchased; consumptionState 0 = not consumed
  return { ok: r.ok && j.purchaseState === 0, externalId: j.orderId ?? token, raw: j }
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
  if (req.method !== 'POST') return new Response('POST', { status: 405 })
  const auth = req.headers.get('authorization') ?? ''
  const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as { platform?: string; productId?: string; token?: string } | null
  if (!body?.platform || !body.productId || !body.token) return Response.json({ error: 'bad request' }, { status: 400 })

  const v = body.platform === 'google' ? await verifyGoogle(body.productId, body.token)
    : body.platform === 'apple' ? await verifyApple(body.productId, body.token)
    : body.platform === 'steam' ? await verifySteam(body.productId, body.token)
    : { ok: false, externalId: '', raw: {} }
  if (!v.ok) return Response.json({ error: 'receipt invalid', raw: v.raw }, { status: 402 })

  const { data, error } = await admin.rpc('rvn_grant_purchase', { p_user: user.id, p_platform: body.platform, p_product: body.productId, p_external: v.externalId, p_raw: v.raw })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
})
