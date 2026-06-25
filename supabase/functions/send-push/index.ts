// ── Edge Function: send-push (FCM HTTP v1) ────────────────────────────────────
// Siunčia push žinutę vartotojui (visiems jo įrenginio token'ams).
// Kviečiama iš DB trigger'io (pg_net) arba iš serverio: POST { userId, title, body, link? }
// ENV (nustatyti `supabase secrets set`):
//   FCM_SERVICE_ACCOUNT = Firebase service account JSON (visas, vienoje eilutėje)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY = automatiškai prieinami
//   SEND_PUSH_SECRET = bendras slaptažodis (trigger'is siunčia Authorization: Bearer <secret>)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '')
  const bin = atob(b64); const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}
function b64url(s: string): string { return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`))
  const jwt = `${header}.${claim}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  return (await res.json()).access_token
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('SEND_PUSH_SECRET')
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('forbidden', { status: 403 })
    const { userId, title, body, link } = await req.json()
    if (!userId) return new Response('userId required', { status: 400 })

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: tokens } = await sb.from('user_push_tokens').select('token').eq('user_id', userId)
    if (!tokens || tokens.length === 0) return new Response('no tokens', { status: 200 })

    const sa = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT')!)
    const accessToken = await getAccessToken(sa)
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`
    await Promise.all((tokens as { token: string }[]).map((t) =>
      fetch(url, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { token: t.token, notification: { title: title ?? 'Ravenof', body: body ?? '' }, data: { link: link ?? '/digital' } } }),
      }).catch(() => null)
    ))
    return new Response(JSON.stringify({ ok: true, sent: tokens.length }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
