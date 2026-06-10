'use server'

import { createClient, getCachedUser } from '@/lib/supabase/server'

export type BackfillState = {
  error?: string
  success?: boolean
  processed?: number
  awarded?: number
}

/**
 * Recalculates achievements and XP for ALL users.
 * Calls award_user_badges() per user — idempotent (ON CONFLICT DO NOTHING in try_award_badge).
 * Safe to run multiple times; XP is never duplicated.
 */
export async function recalculateAchievementsForAllUsers(
  prevState: BackfillState,
): Promise<BackfillState> {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { error: 'Neturi admin teisių' }
  }

  // Fetch all user IDs
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')

  if (profilesError) return { error: profilesError.message }
  if (!profiles || profiles.length === 0) return { success: true, processed: 0, awarded: 0 }

  let processed = 0
  let errors = 0

  for (const profile of profiles) {
    try {
      await supabase.rpc('award_user_badges', { p_user_id: profile.id })
      processed++
    } catch {
      errors++
    }
  }

  if (errors > 0) {
    return {
      success: true,
      processed,
      awarded: processed,
      error: `Baigta su ${errors} klaidomis (${processed} vartotojų apdorota)`,
    }
  }

  return { success: true, processed, awarded: processed }
}

/**
 * Recalculates achievements and XP for a single user.
 */
export async function recalculateAchievementsForUser(
  targetUserId: string,
  prevState: BackfillState,
): Promise<BackfillState> {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { error: 'Neturi admin teisių' }
  }

  const { error } = await supabase.rpc('award_user_badges', { p_user_id: targetUserId })

  if (error) return { error: error.message }

  return { success: true, processed: 1, awarded: 1 }
}
