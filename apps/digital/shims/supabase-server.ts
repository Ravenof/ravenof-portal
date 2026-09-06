// @/lib/supabase/server → kliento ekvivalentas. Leidžia lib moduliams (achievements,
// notifications…), kurie importuoja serverio klientą, veikti SPA'oje per naršyklės klientą.
import { createClient as createBrowser } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export async function createClient() { return createBrowser() }

let cached: { at: number; user: User | null } | null = null
export async function getCachedUser(): Promise<User | null> {
  if (cached && Date.now() - cached.at < 5000) return cached.user
  const { data: { user } } = await createBrowser().auth.getUser()
  cached = { at: Date.now(), user }
  return user
}
