// ── Svečio režimas (Supabase anonymous sign-in) ──────────────────────────────
// „Žaisti kaip svečias": sukuriama anoniminė paskyra be el. pašto – žaidėjas iškart
// patenka į žaidimą (Google Play peržiūrai ir naujokams be registracijos).
// Vėliau svečias paskyrą PAVERČIA nuolatine (el. paštas + slaptažodis) – progresas lieka,
// nes user id nesikeičia. Supabase pusėje turi būti įjungta „Allow anonymous sign-ins".
//
// handle_new_user trigeris slapyvardį ima iš raw_user_meta_data.username (anon. vartotojas
// el. pašto neturi), todėl metadata čia PRIVALOMA.
import { createClient } from '@/lib/supabase/client'

export type GuestFail = 'disabled' | 'network' | 'other'

export function isGuestUser(u: { is_anonymous?: boolean } | null | undefined): boolean {
  return !!u?.is_anonymous
}

function classify(msg: string): GuestFail {
  const m = msg.toLowerCase()
  if (m.includes('anonymous') && (m.includes('disabled') || m.includes('not enabled'))) return 'disabled'
  if (m.includes('fetch') || m.includes('network')) return 'network'
  return 'other'
}

export async function signInAsGuest(): Promise<{ ok: true } | { ok: false; reason: GuestFail }> {
  const n = String(Math.floor(100000 + Math.random() * 900000))
  try {
    const { error } = await createClient().auth.signInAnonymously({
      options: { data: { username: `svecias_${n}`, display_name: `Svecias ${n}`, guest: true } },
    })
    if (error) return { ok: false, reason: classify(error.message) }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: classify(e instanceof Error ? e.message : '') }
  }
}

export type UpgradeErr = 'emailTaken' | 'emailInvalid' | 'pwWeak' | 'badCode' | 'notConfirmed' | 'network' | 'other'

function upgradeErr(msg: string): UpgradeErr {
  const m = msg.toLowerCase()
  if (m.includes('already') || m.includes('exists')) return 'emailTaken'
  if (m.includes('password')) return 'pwWeak'
  if (m.includes('token') || m.includes('otp') || m.includes('expired')) return 'badCode'
  if (m.includes('email')) return 'emailInvalid'
  if (m.includes('fetch') || m.includes('network')) return 'network'
  return 'other'
}

const sameEmail = (a: string | null | undefined, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase()

/** 1 žingsnis: pririšam el. paštą. needsConfirm=true – Supabase išsiuntė patvirtinimo laišką. */
export async function guestSetEmail(email: string): Promise<{ ok: true; needsConfirm: boolean } | { ok: false; err: UpgradeErr }> {
  try {
    const { data, error } = await createClient().auth.updateUser({ email: email.trim() })
    if (error) return { ok: false, err: upgradeErr(error.message) }
    return { ok: true, needsConfirm: !sameEmail(data.user?.email, email) }
  } catch (e) {
    return { ok: false, err: upgradeErr(e instanceof Error ? e.message : '') }
  }
}

/** 2a: patvirtinimas kodu iš laiško. */
export async function guestVerifyCode(email: string, token: string): Promise<{ ok: true } | { ok: false; err: UpgradeErr }> {
  try {
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email_change' })
    if (error) return { ok: false, err: 'badCode' }
    return { ok: true }
  } catch (e) {
    return { ok: false, err: upgradeErr(e instanceof Error ? e.message : '') }
  }
}

/** 2b: žaidėjas paspaudė nuorodą laiške (naršyklėje) – pasitikrinam, ar el. paštas jau priskirtas. */
export async function guestEmailConfirmed(email: string): Promise<boolean> {
  try {
    const sb = createClient()
    await sb.auth.refreshSession()
    const { data } = await sb.auth.getUser()
    return sameEmail(data.user?.email, email)
  } catch {
    return false
  }
}

/** 3 žingsnis: slaptažodis – po jo paskyra nebe anoniminė. */
export async function guestSetPassword(password: string): Promise<{ ok: true } | { ok: false; err: UpgradeErr }> {
  try {
    const { error } = await createClient().auth.updateUser({ password })
    if (error) return { ok: false, err: upgradeErr(error.message) }
    return { ok: true }
  } catch (e) {
    return { ok: false, err: upgradeErr(e instanceof Error ? e.message : '') }
  }
}
