// ── Prisijungimas per Steam (tik Electron desktop versijoje su Steam klientu) ──
// Electron main (apps/desktop/steam.js) per steamworks.js gauna Web API bilietą →
// edge funkcija steam-auth jį patikrina Steam serveryje ir grąžina token_hash →
// verifyOtp sukuria Supabase sesiją. Jei žaidėjas jau prisijungęs – Steam susiejamas su jo paskyra.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'

type SteamBridge = {
  steamPlayer?: () => Promise<{ steamId: string; name: string } | null>
  steamAuthTicket?: () => Promise<{ ticket: string; steamId: string | null; persona: string | null } | null>
}
function bridge(): SteamBridge | null {
  if (typeof window === 'undefined') return null
  return (window as any).ravenofDesktop ?? null
}

/** Ar Steam klientas veikia ir galima prisijungti per Steam. */
export async function steamAvailable(): Promise<boolean> {
  const b = bridge()
  if (!b?.steamPlayer || !b.steamAuthTicket) return false
  try { return !!(await b.steamPlayer()) } catch { return false }
}

export type SteamSignInResult = { ok: true; created?: boolean; linked?: boolean } | { ok: false; reason: 'unavailable' | 'ticket' | 'verify' | 'taken' | 'session' }

/** Prisijungti (arba susieti esamą paskyrą) per Steam. */
export async function signInWithSteam(): Promise<SteamSignInResult> {
  const b = bridge()
  if (!b?.steamAuthTicket) return { ok: false, reason: 'unavailable' }
  const t = await b.steamAuthTicket().catch(() => null)
  if (!t?.ticket) return { ok: false, reason: 'ticket' }
  const sb = createClient()
  const { data, error } = await sb.functions.invoke('steam-auth', { body: { ticket: t.ticket, persona: t.persona } })
  if (error) {
    const status = (error as any)?.context?.status as number | undefined
    return { ok: false, reason: status === 409 ? 'taken' : 'verify' }
  }
  const r = data as { ok?: boolean; token_hash?: string; created?: boolean; linked?: boolean }
  if (!r?.ok) return { ok: false, reason: 'verify' }
  if (r.linked) { await sb.auth.refreshSession().catch(() => null); return { ok: true, linked: true } }
  if (!r.token_hash) return { ok: false, reason: 'session' }
  const { error: e2 } = await sb.auth.verifyOtp({ token_hash: r.token_hash, type: 'magiclink' })
  if (e2) return { ok: false, reason: 'session' }
  return { ok: true, created: r.created }
}
