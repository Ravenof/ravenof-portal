'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Triggers award_user_badges() for the given user.
 * Safe to call after any profile/deck/collection change.
 * The DB function is idempotent — calling it multiple times
 * will never double-award XP or duplicate badges.
 */
export async function triggerAchievementCheck(userId: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.rpc('award_user_badges', { p_user_id: userId })
  } catch {
    // Achievement check must never break the calling action
  }
}

/**
 * Awards a specific achievement by badge_key.
 * Uses the DB try_award_badge() which is idempotent and XP-safe.
 */
export async function awardAchievement(
  userId: string,
  badgeKey: string,
  sourceType?: string,
  sourceId?: string,
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.rpc('try_award_badge', {
      p_user_id:     userId,
      p_badge_key:   badgeKey,
      p_source_type: sourceType ?? null,
      p_source_id:   sourceId ?? null,
    })
    return data === true
  } catch {
    return false
  }
}
