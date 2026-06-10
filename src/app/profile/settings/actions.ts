'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { triggerAchievementCheck, awardAchievement } from '@/lib/achievements'

export type PrivacySettings = {
  show_level: boolean
  show_badges: boolean
  show_attended_events: boolean
  show_public_decks: boolean
  show_profile_details: boolean
  show_owned_cards: boolean
  show_on_leaderboards: boolean
  is_public?: boolean
  bio?: string
  display_name?: string
}

export async function updateAvatarUrl(avatarUrl: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Nesate prisijunge' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.username) revalidatePath(`/users/${profile.username}`)
  revalidatePath('/profile/settings')

  // face_in_arena + complete_profile + any XP-threshold badges
  await triggerAchievementCheck(user.id)

  return { success: true }
}

export async function updatePrivacySettings(settings: PrivacySettings) {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Nesate prisijunge' }

  const updatePayload: Record<string, unknown> = {
    show_level:           settings.show_level,
    show_badges:          settings.show_badges,
    show_attended_events: settings.show_attended_events,
    show_public_decks:    settings.show_public_decks,
    show_profile_details: settings.show_profile_details,
    show_owned_cards:     settings.show_owned_cards,
    show_on_leaderboards: settings.show_on_leaderboards,
  }

  if (settings.is_public !== undefined) updatePayload.is_public = settings.is_public
  if (settings.bio       !== undefined) updatePayload.bio        = settings.bio
  if (settings.display_name !== undefined) updatePayload.display_name = settings.display_name

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.username) revalidatePath(`/users/${profile.username}`)
  revalidatePath('/profile/settings')

  // secret_strategist: any privacy setting change
  await awardAchievement(user.id, 'secret_strategist')
  // open_player / complete_profile / profile-based badges
  await triggerAchievementCheck(user.id)

  return { success: true }
}
