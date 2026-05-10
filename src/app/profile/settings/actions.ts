'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type PrivacySettings = {
  show_level: boolean
  show_badges: boolean
  show_attended_events: boolean
  show_public_decks: boolean
  show_profile_details: boolean
  show_owned_cards: boolean
}

export async function updatePrivacySettings(settings: PrivacySettings) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nesate prisijungę' }

  const { error } = await supabase
    .from('profiles')
    .update({
      show_level: settings.show_level,
      show_badges: settings.show_badges,
      show_attended_events: settings.show_attended_events,
      show_public_decks: settings.show_public_decks,
      show_profile_details: settings.show_profile_details,
      show_owned_cards: settings.show_owned_cards,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // Get username to revalidate profile page
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.username) {
    revalidatePath(`/users/${profile.username}`)
  }
  revalidatePath('/profile/settings')

  return { success: true }
}
