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

const USERNAME_REGEX = /^[a-z0-9_]+$/

const USERNAME_COOLDOWN_DAYS = 30

// ── Result type ───────────────────────────────────────────────────────────────

export type ChangeUsernameResult =
  | { success: true; newUsername: string }
  | { error: string }

// ── Server action ─────────────────────────────────────────────────────────────

export async function changeUsername(newUsername: string): Promise<ChangeUsernameResult> {
  // 1. Auth check
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Nesate prisijungę.' }

  // 2. Normalize
  const normalized = newUsername.trim().toLowerCase()

  // 3. Format validation
  if (normalized.length < 3) {
    return { error: 'Vartotojo vardas turi būti bent 3 simbolių.' }
  }
  if (normalized.length > 24) {
    return { error: 'Vartotojo vardas negali būti ilgesnis nei 24 simboliai.' }
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return { error: 'Vartotojo vardas gali turėti tik raides (a-z), skaičius ir pabraukimą (_).' }
  }

  // 4. Reserved word check
  if (RESERVED_WORDS.has(normalized)) {
    return { error: 'Šis vartotojo vardas rezervuotas.' }
  }

  // 5. Get current profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('username, display_name, username_changed_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr || !profile) return { error: 'Profilis nerastas.' }

  // 6. Cooldown check (30 days)
  if (profile.username_changed_at) {
    const lastChange = new Date(profile.username_changed_at as string)
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < USERNAME_COOLDOWN_DAYS) {
      const canChangeDate = new Date(lastChange)
      canChangeDate.setDate(canChangeDate.getDate() + USERNAME_COOLDOWN_DAYS)
      const dateStr = canChangeDate.toLocaleDateString('lt-LT', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
      return { error: `Vartotojo vardą galima keisti tik kartą per 30 dienų. Vėl galėsite keisti: ${dateStr}.` }
    }
  }

  // 7. Same username check
  if ((profile.username as string) === normalized) {
    return { error: 'Naujas vartotojo vardas sutampa su dabartiniu.' }
  }

  // 8. Uniqueness check
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalized)
    .maybeSingle()

  if (existing) {
    return { error: 'Šis vartotojo vardas jau užimtas.' }
  }

  const oldUsername = profile.username as string
  const now = new Date().toISOString()
  const visibleUntil = new Date(Date.now() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // 9. Update profiles (user can UPDATE their own row via standard RLS)
  // Also update display_name if the user never customised it (it still matches the old username)
  const shouldUpdateDisplayName = (profile.display_name as string | null) === oldUsername
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      username:                        normalized,
      previous_username:               oldUsername,
      previous_username_visible_until: visibleUntil,
      username_changed_at:             now,
      updated_at:                      now,
      ...(shouldUpdateDisplayName ? { display_name: normalized } : {}),
    })
    .eq('id', user.id)

  if (updateErr) {
    if (updateErr.code === '23505') {
      return { error: 'Šis vartotojo vardas jau užimtas.' }
    }
    return { error: 'Nepavyko atnaujinti vartotojo vardo. Bandykite dar kartą.' }
  }

  // 10. Insert history row (RLS: user can INSERT own rows)
  await supabase
    .from('profile_username_history')
    .insert({
      user_id:       user.id,
      old_username:  oldUsername,
      new_username:  normalized,
      changed_at:    now,
      visible_until: visibleUntil,
    })

  // 11. Revalidate
  revalidatePath('/me')
  revalidatePath('/profile/settings')
  revalidatePath(`/users/${oldUsername}`)
  revalidatePath(`/users/${normalized}`)

  return { success: true, newUsername: normalized }
}
