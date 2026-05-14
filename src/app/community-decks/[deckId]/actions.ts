'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addComment(deckId: string, body: string): Promise<{ error?: string }> {
  const trimmed = body.trim()
  if (!trimmed) return { error: 'Komentaras negali buti tuscias' }
  if (trimmed.length > 1000) return { error: 'Komentaras per ilgas (max 1000 simboliu)' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Reikia prisijungti' }

  const { error } = await supabase
    .from('deck_comments')
    .insert({ deck_id: deckId, user_id: user.id, body: trimmed })

  if (error) return { error: error.message }

  revalidatePath(`/community-decks/${deckId}`)
  return {}
}

export async function deleteComment(commentId: string, deckId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Reikia prisijungti' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isModerator = profile?.role === 'admin' || profile?.role === 'event_moderator'

  // Admin/mod: set status = 'hidden' on any comment
  // Author: set status = 'deleted' on own comment only
  const newStatus = isModerator ? 'hidden' : 'deleted'

  let query = supabase
    .from('deck_comments')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', commentId)

  if (!isModerator) {
    // Authors can only touch their own comments
    query = query.eq('user_id', user.id)
  }

  const { error } = await query

  if (error) {
    if (error.message.includes('row-level security') || error.message.includes('policy')) {
      return { error: 'Neturi teises atlikti si veiksma' }
    }
    return { error: 'Klaida trinant komentara. Bandyk dar karta.' }
  }

  revalidatePath(`/community-decks/${deckId}`)
  return {}
}
