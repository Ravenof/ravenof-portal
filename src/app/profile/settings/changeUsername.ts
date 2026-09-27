'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'

// ── Validation constants ──────────────────────────────────────────────────────

const RESERVED_WORDS = new Set([
  'admin', 'moderator', 'ravenof', 'api', 'login', 'register', 'me',
  'users', 'events', 'cards', 'deck', 'decks', 'settings', 'profile',
  'community', 'leaderboards', 'my-decks', 'my-cards', 'my-events',
  'life-tracker', 'offline', 'system', 'support', 'help',
])

const USERNAME_REGEX = /^[a-z0-9_]+$/   // tikrinamas JAU normalizuotas (mazosiomis) vardas

const USERNAME_COOLDOWN_DAYS = 30

// ── Result type ───────────────────────────────────────────────────────────────

export type ChangeUsernameResult =
  | { success: true; newUsername: string }
  | { error: string }

// ── Server action ─────────────────────────────────────────────────────────────

export async function changeUsername(newUsername: string): Promise<ChangeUsernameResult> {
  // Visa logika serveryje: rvn_change_name (migr 20261004_name_change.sql) –
  // kartą per 30 d., ankstesnis vardas rodomas 60 d., guard'as draudžia tiesioginį update.
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Nesate prisijungę.' }
  const typed = newUsername.trim()
  if (RESERVED_WORDS.has(typed.toLowerCase())) return { error: 'Šis vartotojo vardas rezervuotas.' }
  if (!USERNAME_REGEX.test(typed.toLowerCase())) {
    return { error: 'Vartotojo vardas gali turėti tik raides, skaičius ir pabraukimą (_).' }
  }

  const { data: before } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  const { data, error } = await supabase.rpc('rvn_change_name', { p_name: typed })
  if (error) {
    const m = /name_(auth|format|reserved|same|taken|cooldown)(?::(\S+))?/.exec(error.message)
    switch (m?.[1]) {
      case 'auth': return { error: 'Nesate prisijungę.' }
      case 'format': return { error: 'Vardas: 3–20 simbolių, tik raidės, skaičiai ir pabraukimas (_).' }
      case 'reserved': return { error: 'Šis vartotojo vardas rezervuotas.' }
      case 'same': return { error: 'Naujas vartotojo vardas sutampa su dabartiniu.' }
      case 'taken': return { error: 'Šis vartotojo vardas jau užimtas.' }
      case 'cooldown': {
        const d = m?.[2] ? new Date(m[2]).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''
        return { error: `Vartotojo vardą galima keisti tik kartą per ${USERNAME_COOLDOWN_DAYS} dienų. Vėl galėsite keisti: ${d}.` }
      }
      default: return { error: 'Nepavyko atnaujinti vartotojo vardo. Bandykite dar kartą.' }
    }
  }
  const normalized = (data as { username: string }).username

  revalidatePath('/me')
  revalidatePath('/profile/settings')
  if (before?.username) revalidatePath(`/users/${before.username}`)
  revalidatePath(`/users/${normalized}`)
  return { success: true, newUsername: normalized }
}
